module potjs

go 1.24.5

// Pinned to the authors' own fork/tag with the Iterate() fix applied
// (see kvs.go and https://github.com/ethersphere/proximity-order-trie/pull/32)
// until that PR is merged and released upstream.
replace github.com/ethersphere/proximity-order-trie => github.com/brainiac-8/proximity-order-trie v1.0.2-alpha.8

require github.com/ethersphere/proximity-order-trie v1.0.0

require (
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/cespare/xxhash/v2 v2.2.0 // indirect
	github.com/ethersphere/bee/v2 v2.5.0 // indirect
	github.com/hashicorp/errwrap v1.0.0 // indirect
	github.com/hashicorp/go-multierror v1.1.1 // indirect
	github.com/prometheus/client_golang v1.18.0 // indirect
	github.com/prometheus/client_model v0.6.0 // indirect
	github.com/prometheus/common v0.47.0 // indirect
	github.com/prometheus/procfs v0.12.0 // indirect
	golang.org/x/crypto v0.23.0 // indirect
	golang.org/x/sys v0.20.0 // indirect
	google.golang.org/protobuf v1.33.0 // indirect
)
