package creator

import "errors"

// ErrCreationConflict means an existing character ID belongs to another submission.
var ErrCreationConflict = errors.New("character creation request conflict")
