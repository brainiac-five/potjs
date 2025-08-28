//go:build ext_test

package pot

import (

	"context"
)

// interface (shared with Go POT)
type KeyValueStore interface {

	Get(ctx context.Context, key []byte) ([]byte, error)
	Put(ctx context.Context, key, value []byte) error
	Save(ctx context.Context) ([]byte, error)
}
