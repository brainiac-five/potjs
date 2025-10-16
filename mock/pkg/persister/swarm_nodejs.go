// SwarmNodeJsLoadSaver is a persister for WASM operation w/node.js for POT JS.
//
// It operates as hybrid of Go and Javascript to overcome the sandbox
// restrictions of WASM executables in node.js that disallow the required
// network operations. The Javascript part uses XMLHttpRequest to make
// synchronous GET and POST requests, as needed for the Go POT architecture.
// This is based on node xmlhttprequest-ssl, which implements synchronous
// requests by spawning a child process for the request and blocking
// until it returns to circumvent the otherwise unshakeable asynchronicity
// of fetch under node.js.
//
// https://www.npmjs.com/package/xmlhttprequest-ssl
//

package persister

import (
	"context"
	"strings"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"syscall/js"
)

type SwarmNodeJsLoadSaver struct {
	beeAPIURL string
	postageID []byte
	client    *http.Client
	verbosity int
}

func NewSwarmNodeJsLoadSaver(beeAPIURL string, postageID []byte, verbosity int) *SwarmNodeJsLoadSaver {
	return &SwarmNodeJsLoadSaver{
		beeAPIURL: beeAPIURL,
		postageID: postageID,
		client:    &http.Client{},
		verbosity: verbosity,
	}
}

// get beeapirul with error handling
func (sls *SwarmNodeJsLoadSaver) getBeeAPIURL() (*url.URL, error) {

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm persister: parsing url %s\n", sls.beeAPIURL) }

	u, err := url.Parse(sls.beeAPIURL)
	if err != nil {
		return nil, fmt.Errorf("invalid bee API URL: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, fmt.Errorf("invalid bee API URL: scheme must be http or https")
	}
	if u.Host == "" {
		return nil, fmt.Errorf("invalid bee API URL: host is empty")
	}
	return u, nil
}

func (sls *SwarmNodeJsLoadSaver) Load(ctx context.Context, reference []byte) ([]byte, error) {

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister load: reference %x\n", reference) }

	if len(reference) != 32 {
		return nil, fmt.Errorf("reference must be 32 bytes, got %d", len(reference))
	}

	refHex := fmt.Sprintf("%x", reference)
	u, err := sls.getBeeAPIURL()
	if err != nil {
		return nil, fmt.Errorf("invalid bee API URL: %w", err)
	}
	u.Path = fmt.Sprintf("/bytes/%s", refHex)

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister load: path %s\n", u.Path) }

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister load: getting js fetch function\n") }

	jsFetchSync := js.Global().Get("jsFetchSync")
	if jsFetchSync.Type() == js.TypeUndefined {
		return nil, fmt.Errorf("in swarm persister load, missing or can't locate jsFetchSync()")
	}

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister load: fetch call\n") }

	got := jsFetchSync.Invoke("GET", js.ValueOf(u.String()), "", nil, js.ValueOf(sls.verbosity))

	if got.Type() == js.TypeUndefined {
		return nil, fmt.Errorf("failed to read data from swarm, fetch call failed")
	}

	var data []byte
	if got.InstanceOf(js.Global().Get("Uint8Array")) {
		len := got.Get("length").Int()
		data = make([]byte, len)
		js.CopyBytesToGo(data, got)
		if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister load: fetch call response ‹%x∙\n", data) }
	} else if got.Type() == js.TypeString {
		return nil, fmt.Errorf("failed to retrieve data from swarm, wrong response type from js fetch, string ‹%s∙", got.String())
	} else {
		return nil, fmt.Errorf("failed to retrieve data from swarm, wrong response type from js fetch")
	}

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister load: data %x\n", data) }

	return data, nil
}

func (sls *SwarmNodeJsLoadSaver) Save(ctx context.Context, data []byte) ([]byte, error) {

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister save: %x\n", data) }

	if len(sls.postageID) != 32 {
		return nil, fmt.Errorf("postage ID is not correct. Its length is %d", len(sls.postageID))
	}

	u, err := sls.getBeeAPIURL()
	if err != nil {
		return nil, fmt.Errorf("invalid bee API URL: %w", err)
	}
	u.Path = "/bytes"

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister save: getting js fetch function\n") }

	jsFetchSync := js.Global().Get("jsFetchSync")
	if jsFetchSync.Type() == js.TypeUndefined {
		return nil, fmt.Errorf("missing or can't locate jsFetchSync()")
	}

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister save: fetch call\n") }

	got := jsFetchSync.Invoke("POST",
		js.ValueOf(u.String()),
		js.ValueOf(hex.EncodeToString(data)),
		js.ValueOf(
			map[string]interface{}{"Content-Type": "application/octet-stream",
			"Swarm-Postage-Batch-Id" : fmt.Sprintf("%x", sls.postageID)}),
		js.ValueOf(sls.verbosity))

	if got.Type() == js.TypeUndefined {
		return nil, fmt.Errorf("failed to store data to swarm, fetch call failed")
	}

	if got.Type() == js.TypeString {
		if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister save: fetch call response ‹%s∙\n", strings.Replace(got.String(), "\n", "\\n", -1)) }
	} else {
		return nil, fmt.Errorf("failed to store data to swarm, wrong response type from js fetch")
	}

	respBody := ([]byte)(got.String())

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister save: json unmarshal\n") }
	var response struct {
		Reference string `json:"reference"`
	}
	err = json.Unmarshal(respBody, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}
	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister save: json unmarshal done\n") }

	refHex := response.Reference
	if len(refHex) != 64 {
		return nil, fmt.Errorf("invalid reference length: expected 64 hex chars, got %d", len(refHex))
	}
	reference, err := hex.DecodeString(refHex)
	if err != nil {
		return nil, fmt.Errorf("failed to decode reference hex: %w", err)
	}

	if sls.verbosity > 4 { fmt.Printf("snp:  ∙ swarm node.js persister save received reference: %x\n", reference) }

	return reference, nil
}
