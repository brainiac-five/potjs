
function TestPotKvs(T) {

	T.head("Save KVS with one item, no error, stored value exist")


	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = false

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getBoolean " + key1)
	val = pot.getBoolean(key1)
	assertEqual(T, val, val1)


	val1 = true

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getBoolean " + key1)
	val = pot.getBoolean(key1)
	assertEqual(T, val, val1)


	T.log("--- s t r i n g")

	key1 = "K1"
	val1 = "V1"

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getString " + key1)
	val = pot.getString(key1)
	assertEqual(T, val, val1)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	key1 = "K1"
	val1 = 123

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getNumber " + key1)
	val = pot.getNumber(key1)
	assertEqual(T, val, val1)


	val1 = 123.456

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getNumber " + key1)
	val = pot.getNumber(key1)
	assertEqual(T, val, val1)


	T.log("--- r a w")

	key2 = pot.randKey() 
	val2 = pot.randValue()

	T.start("• put " + hex(key2) + ": " + hex(val2))
	err = pot.put(key2, val2)
	assertNoError(T, err)

	T.log("• get " + hex(key2))
	val = pot.get(key2)
	assertEqual(T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

}

function TestPotKvs_EdgeValues(T) {

	T.head("Edge cases for storing one item")


	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = new Uint8Array([2])

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getBoolean " + key1)
	val = pot.getBoolean(key1)
	assertEqual(T, val, true)


	val1 = new Uint8Array([0,1])

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getBoolean " + key1)
	val = pot.getBoolean(key1)
	assertEqual(T, val, false)


	T.log("--- s t r i n g")

	key1 = "K1"
	val1 = ""

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getString " + key1)
	val = pot.getString(key1)
	assertEqual(T, val, val1)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	key1 = "K1"
	val1 = 0

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getNumber " + key1)
	val = pot.getNumber(key1)
	assertEqual(T, val, val1)


	val1 = 10/3

	T.start("• put " + key1 + ": " + val1)
	err = pot.put(key1, val1)
	assertNoError(T, err)

	T.log("• getNumber " + key1)
	val = pot.getNumber(key1)
	assertEqual(T, val, val1)


	T.log("--- r a w")

	key2 = pot.randKey() 
	val2 = new Uint8Array([])

	T.start("• put " + hex(key2) + ": " + hex(val2))
	err = pot.put(key2, val2)
	assertNoError(T, err)

	T.log("• get " + hex(key2))
	val = pot.get(key2)
	assertEqual(T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	key2 = pot.randKey() 
	val2 = new Uint8Array([0])

	T.start("• put " + hex(key2) + ": " + hex(val2))
	err = pot.put(key2, val2)
	assertNoError(T, err)

	T.log("• get " + hex(key2))
	val = pot.get(key2)
	assertEqual(T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	key2 = pot.randKey() 
	val2 = new Uint8Array([1])

	T.start("• put " + hex(key2) + ": " + hex(val2))
	err = pot.put(key2, val2)
	assertNoError(T, err)

	T.log("• get " + hex(key2))
	val = pot.get(key2)
	assertEqual(T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	key2 = pot.randKey() 
	val2 = new Uint8Array([255,0])

	T.start("• put " + hex(key2) + ": " + hex(val2))
	err = pot.put(key2, val2)
	assertNoError(T, err)

	T.log("• get " + hex(key2))
	val = pot.get(key2)
	assertEqual(T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

}

function TestPotKvs_TypeEncoding(T) {

	T.head("type-enccoding")


	T.log("--- b o o l e a n")

	v = true
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = false
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	v = 0
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = 1
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = 100000000000000
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = 1e20
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = 0.1
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = 1/3
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = 10/3
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = Math.PI
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = Math.PI^2
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = 10000n * 10n^18n
	T.start("• testing bigint " + v)
	e = pot.type_encoded_bytes(v)
	assertEqual(T, typeof new Uint8Array(), typeof e)


	T.log("--- s t r i n g")

	v = "A"
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = "The fox and such hunting that hen and jumping fences? "
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = " "
	T.start("• testing space")
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = "  "
	T.start("• testing spaces")
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = "0"
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = "1.1.1"
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = "0\n\t\b\0"
	T.start("• testing zero digit and special chars")
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = "\n"
	T.start("• testing line break" + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)

	v = "\n\t\b\0"
	T.start("• testing special chars")
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, v, r)


	T.log("--- r a w")

	T.start("• testing random raw bytes")
	v = pot.randValue()
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, hexa(v), hexa(r))

	T.start("• testing empty array")
	v = new Uint8Array()
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, hexa(v), hexa(r))

	T.start("• testing array of sole 0")
	v = new Uint8Array([0])
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, hexa(v), hexa(r))

	T.start("• testing array starting on 0")
	v = new Uint8Array([0,1,2,3])
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(T, hexa(v), hexa(r))


	T.log("--- w r o n g  t y p e")

	T.start("• testing wrong type code")
	v = pot.randValue()
	v[0] = 10 // not a type code
	e = v
	T.log("• testing these wrongly marked bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	if(r instanceof Error) attestExpectedError(T, r.message)
	else attestMissingError(T)

	T.start("• testing byte sequence too short for a number")
	e = new Uint8Array([2,1,0]) // 2 = number, which expects 9 bytes total
	T.log("• testing these too short bytes (for a number): " + hexa(e))
	r = pot.type_decoded_value(e)
	if(r instanceof Error) attestExpectedError(T, r.message)
	else attestMissingError(T)

}

function TestPotKvs_TypedAccess(T) {

	T.head("typed access")

	k = 'K1'

	T.log("--- b o o l e a n")

	v = true
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = false
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	v = 0
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = 1
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = 100000000000000

	v = 1e20
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = 0.1
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = 1/3
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = 10/3
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = Math.PI
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = Math.PI^2
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = 10000n * 10n^18n
	T.start("• put " + k + ": " + v + " as bigint")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertError(T, err) // can't write bigint
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, null) // because not written


	T.log("--- s t r i n g")

	v = "A"
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = "The fox and such hunting that hen and jumping fences? "
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = " "
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = "  "
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = "0"
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = "1.1.1"
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = "0\n\t\b\0"
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = "\n"
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)

	v = "\n\t\b\0"
	T.start("• put " + k + ": " + v)
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.putTyped(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	assertEqual(T, r, v)


	T.log("--- r a w")

	T.start("• testing random raw bytes")
	v = pot.randValue()
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.put(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.get(k)
	assertEqual(T, hexa(r), hexa(v))

	T.start("• testing empty array")
	v = new Uint8Array()
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.put(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.get(k)
	assertEqual(T, hexa(r), hexa(v))

	T.start("• testing array of sole 0")
	v = new Uint8Array([0])
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.put(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.get(k)
	assertEqual(T, hexa(r), hexa(v))

	T.start("• testing array starting on 0")
	v = new Uint8Array([0,1,2,3])
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.put(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.get(k)
	assertEqual(T, hexa(r), hexa(v))


	T.log("--- w r o n g  t y p e")

	T.start("• testing wrong type code")
	v = pot.randValue()
	v[0] = 10 // not a type code
	T.log("• testing these wrongly marked bytes: " + hexa(v))
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.put(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	if(r instanceof Error) attestExpectedError(T, r.message)
	else attestMissingError(T)

	T.start("• testing byte sequence too short for a number")
	v = new Uint8Array([2,1,0]) // 2 = number, which expects 9 bytes total
	T.log("• testing these too short bytes (for a number): " + hexa(v))
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	err = pot.put(k, v)
	assertNoError(T, err)
	T.log("• get " + k)
	r = pot.getTyped(k)
	if(r instanceof Error) attestExpectedError(T, r.message)
	else attestMissingError(T)

}

async function TestPotKvs_Promise(T) {

	T.head("typed access by promise")

	k = 'K1'

	T.log("--- b o o l e a n")

	v = true
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}


	v = false
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}



	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	v = 0
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = 1
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}


	v = 100000000000000
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = 1e20
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = 0.1
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = 1/3
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = 10/3
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = Math.PI
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = Math.PI^2
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}


	T.log("--- s t r i n g")

	v = "A"
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = "The fox and such hunting that hen and jumping fences? "
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = " "
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = "  "
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = "0"
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = "1.1.1"
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = "0\n\t\b\0"
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = "\n"
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	v = "\n\t\b\0"
	T.start("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, r, v)
	} catch(e) {
		attestUnexpectedError(T, e)
	}


	T.log("--- r a w")

	T.start("• testing random raw bytes" + " by promise")
	v = pot.randValue()
	T.log("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, hexa(r), hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	T.start("• testing empty array" + " by promise")
	v = new Uint8Array()
	T.log("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, hexa(r), hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	T.start("• testing array of sole 0" + " by promise")
	v = new Uint8Array([0])
	T.log("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, hexa(r), hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		attestUnexpectedError(T, e)
	}

	T.start("• testing array starting on 0" + " by promise")
	v = new Uint8Array([0,1,2,3])
	T.log("• put " + k + ": " + v + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	try {
		await pot.putTypedPromise(k, v)
		attestNoError(T)
		T.log("• get " + k + " by promise")
		r = await pot.getTypedPromise(k)
		attestNoError(T)
		assertEqual(T, hexa(r), hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		attestUnexpectedError(T, e)
	}


	T.log("--- w r o n g  t y p e")

	v = 1n
	T.start("• put " + k + ": " + v + " as bigint" + " by promise")
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	errored = false
	try {
		await pot.putTypedPromise(k, v)
		attestMissingError(T)
	} catch(e) {
		attestExpectedError(T, e)
	}

	T.start("• testing wrong type code" + " by promise")
	v = pot.randValue()
	v[0] = 10 // not a type code
	T.log("This would be an internal error, or trying to access an entry put raw with the higher-level type-aware get.")
	T.log("• testing these wrongly marked bytes: " + hexa(v))
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	T.log("• putting bytes raw")
	err = pot.put(k, v)
	assertNoError(T, err)
	errored = false
	try {
	T.log("• get " + k + " by promise")
		await pot.getTypedPromise(k)
		attestMissingError(T)
	} catch(err) {
		attestExpectedError(T, err)
	}

	T.start("• testing byte sequence too short for a number" + " by promise")
	v = new Uint8Array([2,1,0]) // 2 = number, which expects 9 bytes total
	T.log("This would be an internal error, or trying to access an entry put raw with the higher-level type-aware get.")
	T.log("• testing these too short bytes (for a number): " + hexa(v))
	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)
	T.log("• putting bytes raw")
	err = pot.put(k, v)
	assertNoError(T, err)
	errored = false
	try {
	T.log("• get " + k + " by promise")
		await pot.getTypedPromise(k)
		attestMissingError(T)
	} catch(err) {
		attestExpectedError(T, err)
	}

}

function TestPotKvs_Save(T) {

	T.head("Saving and Loading")


	T.start("Save empty KVS, return error")

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	ref = pot.save()
	assertEqual(T, ref, 0)


	T.start("Save not empty KVS return valid swarm address")

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	key1 = "K1"
	val1 = "V1"

	T.start("• put " + key1 + ": " + val1)
	err = pot.putTyped(key1, val1)
	assertNoError(T, err)

	T.log("• get " + key1)
	val = pot.getTyped(key1)
	assertEqual(T, val, val1)

	ref = pot.save()
	assertNoError(T, !ref)


	T.start("Save KVS with one item, no error, pre-save and after-save value exist")
	T.log("Note, this order is worth testing because of how POT internally stores values.")

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	key1 = "K1"
	val1 = "V1"

	T.start("• put " + key1 + ": " + val1)
	err = pot.putTyped(key1, val1)
	assertNoError(T, err)

	T.log("• get " + key1)
	val = pot.getTyped(key1)
	assertEqual(T, val, val1)

	ref = pot.save()
	assertNoError(T, !ref)

	T.log("• getString " + key1)
	val = pot.getTyped(key1)
	assertEqual(T, val, val1)


	T.log("Save KVS and add one item, activate new, re-activate previous")

	key1 = "K1"
	val1 = "V1"

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	T.start("• put " + key1 + ": " + val1)
	err = pot.putTyped(key1, val1)
	assertNoError(T, err)

	T.log("• get " + key1)
	val = pot.getTyped(key1)
	assertEqual(T, val, val1)

	first_ref = pot.save()
	assertNoError(T, !ref)

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	T.log("• get " + key1)
	val = pot.getTyped(key1)
	assertEqual(T, val, null)

	ref = pot.newSwarmKvsReference(first_ref)
	assertNoError(T, !ref)
	assertEqual(T, first_ref, ref)

	T.log("• get " + key1)
	val = pot.getTyped(key1)
	assertEqual(T, val, val1)
}

function TestPotKvs_Proof(T) {

	T.head("Proofs")


	T.start("Return a Proof")

	ref = pot.newSwarmKvs()
	assertNoError(T, !ref)

	T.log("• get proof for " + key1)
	val = pot.getProof(key1)
	assertEqual(T, val, null)
}

async function TestPotKvs_Cancellation(T) {

	T.head("Cancellation")
	T.log("This tests the cancellable promises created in Go to control resource leakage.")


	T.start("Time Out of Test Function")

	T.log("create hanging test promise and let it time out (try-catch)")
	try {
		ref = await pot.hangingPromise()
		attestMissingError(T)
	} catch(err) {
		attestExpectedError(T, err, "Error: done sleeping, nothing happened")
	}


	T.start("Time Out of Test Function II")

	T.log("create hanging test promise and let it time out (chained catch)")
	ref = await pot.hangingPromise()
		.catch((err)=>attestExpectedError(T, err, "Error: done sleeping, nothing happened"))


	T.start("Cancel Timer")

	T.log("create hanging test promise and cancel it (by timer, try-catch)")
	try {
		ref = pot.hangingPromise()
		setTimeout(ref.cancel, 500)
		await ref
		attestMissingError(T)
	} catch(err) {
		attestExpectedError(T, err, "Error: canceled")
	}


	T.start("Cancel Timer II")

	T.log("create hanging test promise and cancel it (by timer, chain .catch)")
	try {
		ref = pot.hangingPromise()
		setTimeout(ref.cancel, 500)
		// note, don't chain the .catch above to get the wrong ref. 
		await ref.catch((err)=>attestExpectedError(T, err, "Error: canceled"))
	} catch(err) {
		attestUnexpectedError(T, err)
	}


	T.start("Cancel Delay")

	T.log("create hanging test promise and cancel it (delay, chain .catch)")
	try {
		ref = pot.hangingPromise()
		// note, don't chain the .catch above to get the wrong ref. 
		ref.catch((err)=>attestExpectedError(T, err, "Error: canceled"))
		await delay(500);
		ref.cancel()
	} catch(err) {
		attestUnexpectedError(T, err)
	}

	await delay(700)

/* Does not work, although X1 does. Throughs Uncaught (in promise) Error: canceled
	T.start("Immediate Cancel")

	T.log("create hanging test promise and cancel it immediately (try-catch)")
	try {
		ref = pot.hangingPromise()
		ref.cancel()
		// also does not work with 500ms delay here
		attestMissingError(T)
	} catch(err) {
		attestExpectedError(T, err, "Error: canceled")
	}
*/
	T.start("Immediate Cancel II")

	T.log("create hanging test promise and cancel it immediately (chain .catch)")
	try {
		ref = pot.hangingPromise()
		// note, don't chain the .catch above to get the wrong ref. 
		ref.catch((err)=>attestExpectedError(T, err, "Error: canceled"))
		ref.cancel()
	} catch(err) {
		attestUnexpectedError(T, err)
	}
}

