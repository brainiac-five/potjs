const t0 = null
const massmax = 100 // iterations for mass concurrent tests

var map
var map1
var map2
var map3
var map4
var map5

function TestPotKvsSync(T, bee_url, batch_id) {

	T.head("Simple gets and puts of KVS with one item, synchronous", bee_url)

	if(bee_url)
		return

	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = false

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getBooleanSync " + key1)
	val = map.getBooleanSync(key1)
	assertEqual(t0, T, val, val1)

	val1 = true

	T.start("• put " + key1 + ": " + val1)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getBooleanSync " + key1)
	val = map.getBooleanSync(key1)
	assertEqual(t0, T, val, val1)


	T.log("--- s t r i n g")

	key1 = "K1"
	val1 = "V1"

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getStringSync " + key1)
	val = map.getStringSync(key1)
	assertEqual(t0, T, val, val1)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	key1 = "K1"
	val1 = 123

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getNumberSync " + key1)
	val = map.getNumberSync(key1)
	assertEqual(t0, T, val, val1)


	val1 = 123.456

	T.start("• put " + key1 + ": " + val1)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getNumberSync " + key1)
	val = map.getNumberSync(key1)
	assertEqual(t0, T, val, val1)


	T.log("--- r a w")

	key2 = pot.randKey()
	val2 = pot.randValue()

	T.start("• put " + hex(key2) + ": " + hex(val2))

	T.log("• put " + hex(key2) + ": " + hex(val2))
	err = map.putRawSync(key2, val2)
	assertNoError(t0, T, err)

	T.log("• get " + hex(key2))
	val = map.getRawSync(key2)
	assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

}

async function TestPotKvsAsync(T, bee_url, batch_id) {

	T.head("Simple gets and puts with one item, typed and raw, async")

	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = false

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		assertNoError(t0, T, err)

		T.log("• getBoolean " + key1)
		val = await map.getBoolean(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	val1 = true

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)


	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		assertNoError(t0, T, err)

		T.log("• getBoolean " + key1)
		val = await map.getBoolean(key1)
		assertEqual(t0, T, val, val1)


	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("--- s t r i n g")

	key1 = "K1"
	val1 = "V1"

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		assertNoError(t0, T, err)

		T.log("• getString " + key1)
		val = await map.getString(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	key1 = "K1"
	val1 = 123

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• put raw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		assertNoError(t0, T, err)

		T.log("• getNumber " + key1)
		val = await map.getNumber(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	val1 = 123.456

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		assertNoError(t0, T, err)

		T.log("• getNumber " + key1)
		val = await map.getNumber(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}


	T.log("--- r a w")

	key2 = pot.randKey()
	val2 = pot.randValue()

	T.start("• put raw " + hex(key2) + ": " + hex(val2))

	try {
		T.log("• putRaw " + hex(key2) + ": " + hex(val2))
		err = await map.putRaw(key2, val2)
		assertNoError(t0, T, err)

		T.log("• getRaw " + hex(key2))
		val = await map.getRaw(key2)
		assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}
}

function TestPotKvs_EdgeValuesSync(T, bee_url, batch_id) {

	if(bee_url)
		return

	T.head("Edge cases for storing one item, untyped, synchronous calls")


	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = new Uint8Array([2])

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getBooleanSync " + key1)
	val = map.getBooleanSync(key1)
	assertEqual(t0, T, val, true)


	val1 = new Uint8Array([0,1])

	T.start("• put " + key1 + ": " + val1)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getBooleanSync " + key1)
	val = map.getBooleanSync(key1)
	assertEqual(t0, T, val, false)


	T.log("--- s t r i n g")

	key1 = "K1"
	val1 = ""

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getStringSync " + key1)
	val = map.getStringSync(key1)
	assertEqual(t0, T, val, val1)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	key1 = "K1"
	val1 = 0

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getNumberSync " + key1)
	val = map.getNumberSync(key1)
	assertEqual(t0, T, val, val1)


	val1 = 10/3

	T.start("• put " + key1 + ": " + val1)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	T.log("• getNumberSync " + key1)
	val = map.getNumberSync(key1)
	assertEqual(t0, T, val, val1)


	T.log("--- r a w")

	key2 = pot.randKey() 
	val2 = new Uint8Array([])

	T.start("• put " + hex(key2) + ": " + hex(val2))

	T.log("• put " + hex(key2) + ": " + hex(val2))
	err = map.putRawSync(key2, val2)
	assertNoError(t0, T, err)

	T.log("• get " + hex(key2))
	val = map.getRawSync(key2)
	assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	key2 = pot.randKey() 
	val2 = new Uint8Array([0])

	T.start("• put " + hex(key2) + ": " + hex(val2))

	T.log("• put " + hex(key2) + ": " + hex(val2))
	err = map.putRawSync(key2, val2)
	assertNoError(t0, T, err)

	T.log("• get " + hex(key2))
	val = map.getRawSync(key2)
	assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	key2 = pot.randKey() 
	val2 = new Uint8Array([1])

	T.start("• put " + hex(key2) + ": " + hex(val2))

	T.log("• put " + hex(key2) + ": " + hex(val2))
	err = map.putRawSync(key2, val2)
	assertNoError(t0, T, err)

	T.log("• get " + hex(key2))
	val = map.getRawSync(key2)
	assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	key2 = pot.randKey() 
	val2 = new Uint8Array([255,0])

	T.start("• put " + hex(key2) + ": " + hex(val2))

	T.log("• put " + hex(key2) + ": " + hex(val2))
	err = map.putRawSync(key2, val2)
	assertNoError(t0, T, err)

	T.log("• get " + hex(key2))
	val = map.getRawSync(key2)
	assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

}

async function TestPotKvs_EdgeValuesAsync(T, bee_url, batch_id) {

	T.head("Edge cases for storing one item, typed, async")

	T.log("These tests do not include the untyped functions that exist only in synchronous form.")


	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = new Uint8Array([1,1]) // different from sync test

	try {
		T.start("• put " + key1 + ": " + val1)

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• putRaw " + key1 + ": " + val1)

		err = await map.putRaw(key1, val1) 
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, true)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	key1 = "K1"
	val1 = 1

	try {
		T.start("• put " + key1 + ": " + val1)

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)

		err = await map.put(key1, val1) 
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, true)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	try {
		val1 = new Uint8Array([1,0]) // different from sync test

		T.start("• put " + key1 + ": " + val1)

		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, false)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	try {
		val1 = new Uint8Array([1,0,1]) // different from sync test

		T.start("• put " + key1 + ": " + val1)

		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, false)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	try {
		val1 = 0

		T.start("• put " + key1 + ": " + val1)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1) // will put number
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, false)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}


	T.log("--- s t r i n g")

	try {
		key1 = "K1"
		val1 = ""

		T.start("• put " + key1 + ": " + val1)

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("--- n u m b e r")

	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	try {
		key1 = "K1"
		val1 = 0

		T.start("• put " + key1 + ": " + val1)

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	try {
		val1 = 10/3

		T.start("• put " + key1 + ": " + val1)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}


	T.log("--- r a w")

	try {
		key2 = pot.randKey() 
		val2 = new Uint8Array([])

		T.start("• put " + hex(key2) + ": empty byte array")

		T.log("• putRaw " + hex(key2) + ": empty byte array")
		err = await map.putRaw(key2, val2)
		assertNoError(t0, T, err)

		T.log("• getRaw " + hex(key2))
		val = await map.getRaw(key2)
		assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	try {
		key2 = pot.randKey() 
		val2 = new Uint8Array([0])

		T.start("• put " + hex(key2) + ": " + hex(val2))

		T.log("• putRaw " + hex(key2) + ": " + hex(val2))
		err = await map.putRaw(key2, val2)
		assertNoError(t0, T, err)

		T.log("• getRaw " + hex(key2))
		val = await map.getRaw(key2)
		assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays


	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	try {
		key2 = pot.randKey() 
		val2 = new Uint8Array([1])

		T.start("• put " + hex(key2) + ": " + hex(val2))

		T.log("• putRaw " + hex(key2) + ": " + hex(val2))
		err = await map.putRaw(key2, val2)
		assertNoError(t0, T, err)

		T.log("• getRaw " + hex(key2))
		val = await map.getRaw(key2)
		assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	try {
		key2 = pot.randKey() 
		val2 = new Uint8Array([255,0])

		T.start("• put " + hex(key2) + ": " + hex(val2))

		T.log("• putRaw " + hex(key2) + ": " + hex(val2))
		err = await map.putRaw(key2, val2)
		assertNoError(t0, T, err)

		T.log("• getRaw " + hex(key2))
		val = await map.getRaw(key2)
		assertEqual(t0, T, hex(val), hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

}

function TestPotKvs_TypeEncoding(T, bee_url, batch_id) {

	T.head("type-enccoding")


	T.log("--- b o o l e a n")

	v = true
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = false
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	v = 0
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = 1
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = 100000000000000
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = 1e20
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = 0.1
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = 1/3
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = 10/3
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = Math.PI
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = Math.PI^2
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("IEEE 754 encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = 10000n * 10n^18n
	T.start("• testing bigint " + v)
	e = pot.type_encoded_bytes(v)
	assertEqual(t0, T, typeof e, typeof new Uint8Array())


	T.log("--- s t r i n g")

	v = "A"
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = "The fox and such hunting that hen and jumping fences? "
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = " "
	T.start("• testing space")
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = "  "
	T.start("• testing spaces")
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = "0"
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = "1.1.1"
	T.start("• testing " + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = "0\n\t\b\0"
	T.start("• testing zero digit and special chars")
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = "\n"
	T.start("• testing line break" + v)
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)

	v = "\n\t\b\0"
	T.start("• testing special chars")
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, r, v)


	T.log("--- r a w")

	T.start("• testing random raw bytes")
	v = pot.randValue()
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, hexa(r), hexa(v))

	T.start("• testing empty array")
	v = new Uint8Array()
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, hexa(r), hexa(v))

	T.start("• testing array of sole 0")
	v = new Uint8Array([0])
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, hexa(r), hexa(v))

	T.start("• testing array starting on 0")
	v = new Uint8Array([0,1,2,3])
	e = pot.type_encoded_bytes(v)
	T.log("encoded bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	assertEqual(t0, T, hexa(r), hexa(v))


	T.log("--- w r o n g  t y p e")

	T.start("• testing wrong type code")
	v = pot.randValue()
	v[0] = 10 // not a type code
	e = v
	T.log("• testing these wrongly marked bytes: " + hexa(e))
	r = pot.type_decoded_value(e)
	if(r instanceof Error) attestExpectedError(t0, T, r.message)
	else attestMissingError(t, T)

	T.start("• testing byte sequence too short for a number")
	e = new Uint8Array([2,1,0]) // 2 = number, which expects 9 bytes total
	T.log("• testing these too short bytes (for a number): " + hexa(e))
	r = pot.type_decoded_value(e)
	if(r instanceof Error) attestExpectedError(t0, T, r.message)
	else attestMissingError(t, T)

}

function TestPotKvs_TypedAccessSync(T, bee_url, batch_id) {

	if(bee_url)
		return

	T.head("typed access")

	k = 'K1'

	T.log("--- b o o l e a n")

	v = true
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = false
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !pot)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	v = 0
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = 1
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = 100000000000000

	v = 1e20
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = 0.1
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = 1/3
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = 10/3
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = Math.PI
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = Math.PI^2
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = 10000n * 10n^18n
	T.start("• put " + k + ": " + v + " as bigint")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertError(t0, T, err) // can't write bigint
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, null) // because not written


	T.log("--- s t r i n g")

	v = "A"
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = "The fox and such hunting that hen and jumping fences? "
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = " "
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = "  "
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = "0"
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = "1.1.1"
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = "0\n\t\b\0"
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = "\n"
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)

	v = "\n\t\b\0"
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	assertEqual(t0, T, r, v)


	T.log("--- r a w")

	T.start("• testing random raw bytes")
	v = pot.randValue()
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getRawSync(k)
	assertEqual(t0, T, hexa(r), hexa(v))

	T.start("• testing empty array")
	v = new Uint8Array()
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getRawSync(k)
	assertEqual(t0, T, hexa(r), hexa(v))

	T.start("• testing array of sole 0")
	v = new Uint8Array([0])
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getRawSync(k)
	assertEqual(t0, T, hexa(r), hexa(v))

	T.start("• testing array starting on 0")
	v = new Uint8Array([0,1,2,3])
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getRawSync(k)
	assertEqual(t0, T, hexa(r), hexa(v))


	T.log("--- w r o n g  t y p e")

	T.start("• testing wrong type code")
	v = pot.randValue()
	v[0] = 10 // not a type code
	T.log("• testing these wrongly marked bytes: " + hexa(v))
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	if(r instanceof Error) attestExpectedError(t0, T, r.message)
	else attestMissingError(t, T)

	T.start("• testing byte sequence too short for a number")
	v = new Uint8Array([2,1,0]) // 2 = number, which expects 9 bytes total
	T.log("• testing these too short bytes (for a number): " + hexa(v))
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	if(r instanceof Error) attestExpectedError(t0, T, r.message)
	else attestMissingError(t, T)
}

async function TestPotKvs_TypedAccessAsync(T, bee_url, batch_id) {

	T.head("typed access by promise")

	k = 'K1'

	T.log("--- b o o l e a n")

	v = true
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = false
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	v = 0
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = 1
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}


	v = 100000000000000
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = 1e20
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = 0.1
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = 1/3
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = 10/3
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = Math.PI
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = Math.PI^2
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}


	T.log("--- s t r i n g")

	v = "A"
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = "The fox and such hunting that hen and jumping fences? "
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = " "
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = "  "
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = "0"
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = "1.1.1"
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = "0\n\t\b\0"
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = "\n"
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	v = "\n\t\b\0"
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, r, v)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}


	T.log("--- r a w")

	T.start("• testing random raw bytes" + " by promise")
	v = pot.randValue()
	T.log("• put " + k + ": " + hex(v) + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, hexa(r), hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	T.start("• testing empty array" + " by promise")
	v = new Uint8Array()
	T.log("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, hexa(r), hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	T.start("• testing array of sole 0" + " by promise")
	v = new Uint8Array([0])
	T.log("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, hexa(r), hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}

	T.start("• testing array starting on 0" + " by promise")
	v = new Uint8Array([0,1,2,3])
	T.log("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		attestNoError(t0, T)
		assertEqual(t0, T, hexa(r), hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}


	T.log("--- w r o n g  t y p e")

	v = 1n
	T.start("• put " + k + ": " + v + " as bigint" + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	errored = false
	try {
		await map.put(k, v)
		attestMissingError(t, T)
	} catch(e) {
		attestExpectedError(t0, T, e)
	}

	T.start("• testing wrong type code" + " by promise")
	v = pot.randValue()
	v[0] = 10 // not a type code
	T.log("This would be an internal error, or trying to access an entry put raw with the higher-level type-aware get.")
	T.log("• testing these wrongly marked bytes: " + hexa(v))
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	T.log("• putting bytes raw")
	try {
		err = await map.putRaw(k, v)
		attestNoError(t0, T)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}
	assertNoError(t0, T, err)
	errored = false
	T.log("• get " + k + " by promise")
	try {
		await map.get(k)
		attestMissingError(t, T)
	} catch(err) {
		attestExpectedError(t0, T, err)
	}

	T.start("• testing byte sequence too short for a number" + " by promise")
	v = new Uint8Array([2,1,0]) // 2 = number, which expects 9 bytes total
	T.log("This would be an internal error, or trying to access an entry put raw with the higher-level type-aware get.")
	T.log("• testing these too short bytes (for a number): " + hexa(v))
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)
	T.log("• putting bytes raw")
	try {
		err = await map.putRaw(k, v)
		attestNoError(t0, T)
	} catch(e) {
		attestUnexpectedError(t0, T, e)
	}
	assertNoError(t0, T, err)
	errored = false
	try {
	T.log("• get " + k + " by promise")
		await map.get(k)
		attestMissingError(t, T)
	} catch(err) {
		attestExpectedError(t0, T, err)
	}

}

async function TestPotKvs_Save(T, bee_url, batch_id) {

	T.head("Saving and Loading")


	T.start("Save empty KVS, return error")

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	T.log("• save")
	ref = map.saveSync()
	assertIsError(t0, T, ref)


	if(!bee_url) {

		T.start("Save not empty KVS return valid swarm address, synchronous")

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		key1 = "K1"
		val1 = "V1"

		T.log("• put " + key1 + ": " + val1)
		try {
			err = await map.put(key1, val1)
			attestNoError(t0, T)
		} catch(e) {
			attestUnexpectedError(t0, T, e)
		}
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)

		T.log("• save")
		ref = map.saveSync()
		assertNotAnError(t0, T, ref)
	}

	T.start("Save not empty KVS return valid swarm address, with Promises")

	key1 = "K1"
	val1 = "V1"

	try {
		T.log("• new map")
		map = await pot.new()
		assertNoError(t0, T, !map)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• save")
	try {
		save_ref = map.save()
		assertNotAnError(t0, T, save_ref)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}


	if(!bee_url) {
		T.start("Save KVS with one item, no error, pre-save and after-save value exist")
		T.log("Note, this order is worth testing because of how POT internally stores values.")

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		key1 = "K1"
		val1 = "V1"

		T.log("• put " + key1 + ": " + val1)
		err = map.putSync(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = map.getSync(key1)
		assertEqual(t0, T, val, val1)

		T.log("• save")
		save_ref = map.saveSync()
		assertNotAnError(t0, T, save_ref)

		T.log("• getStringSync " + key1)
		val = map.getSync(key1)
		assertEqual(t0, T, val, val1)
	}


	if(!bee_url) {
		T.start("Save KVS and add one item, activate new, re-activate previous")

		key1 = "K1"
		val1 = "V1"

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = map.putSync(key1, val1)
		assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = map.getSync(key1)
		assertEqual(t0, T, val, val1)

		T.log("• save")
		save_ref = map.saveSync()
		assertNotAnError(t0, T, save_ref)
		T.log("√ KVS saved under key " + hex(save_ref))

		T.log("• new map")
		map2 = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map2)

		// lookup in all-new map: will fail
		T.log("• get " + key1 + " from new map")
		val = map2.getSync(key1)
		assertEqual(t0, T, val, null)

		T.log("• retrieve map " + hex(save_ref))
		map3 = pot.newByReferenceSync(save_ref)
		assertNotAnError(t0, T, map3)
		assertNotEqual(t0, T, map3, null)
		/// console.log(map3)
		assertEqual(t0, T, map3.slot_ref, map.slot_ref)

		T.log("• get " + key1 + " from reloaded map")
		val = map3.getSync(key1)
		assertEqual(t0, T, val, val1)
	}

}

async function TestPotKvs_ComplexSave(T, bee_url, batch_id) {

	T.head("Saving and Loading, Switching, with Promises")

	T.start("Save KVS and add one item, activate new, re-activate previous, with Promises")

	key1 = "K1"
	val1 = "V1"

	try {
		T.log("• new map")
		map = await pot.new()
		assertNoError(t0, T, !map)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• save")
	try {
		save_ref = await map.save()
		assertNotAnError(t0, T, save_ref)
		T.log("√ KVS saved under key " + hex(save_ref))
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• new map")
	try {
		map2 = await pot.new()
		assertNoError(t0, T, !map2)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup in all-new map: will not find it
	T.log("• get " + key1 + " from new map")
	try {
		val = await map2.get(key1)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve map " + hex(save_ref))
	try {
		map3 = await pot.newByReference(save_ref)
		assertNotAnError(t0, T, map3)
		assertNotEqual(t0, T, map3, null)
		/// console.log(map3)
		assertEqual(t0, T, map3.slot_ref, map.slot_ref)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}


	T.start("Save KVS, re-activate previous, interact, with Promises")

	key1 = "K1"
	val1 = "V1"
	key2 = "K2"
	val2 = "V2"
	key3 = "K3"
	val3 = "V3"

	try {
		T.log("• new map")
		map = await pot.new()
		assertNoError(t0, T, !map)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup in all-new map: will not find it
	T.log("• get " + key2 + " that should not exist")
	try {
		val = await map.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• save")
	try {
		save_ref = await map.save()
		assertNotAnError(t0, T, save_ref)
		T.log("√ KVS saved under key " + hex(save_ref))
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• new map")
	try {
		map2 = await pot.new()
		assertNoError(t0, T, !map2)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from new map")
	try {
		val = await map2.get(key1)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from new map")
	try {
		val = await map2.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key2 + ": " + val2)
	try {
		err = await map2.put(key2, val2)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key2)
	try {
		val = await map2.get(key2)
		assertEqual(t0, T, val, val2)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// no saving of 2nd map

	T.log("• retrieve first map " + hexa(save_ref))
	try {
		map3 = await pot.newByReference(save_ref)
		assertNotAnError(t0, T, map3)
		assertNotEqual(t0, T, map3, null)
		assertEqual(t0, T, map3.slot_ref, map.slot_ref)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1 + " from first map")
	try {
		val = await map3.get(key1)
		assertEqual(t0, T, val, val1)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: should not find it
	T.log("• get " + key2 + " from first map")
	try {
		val = await map3.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key3 + ": " + val3 + " to first map")
	try {
		err = await map3.put(key3, val3)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key3 + " from first map")
	try {
		val = await map3.get(key3)
		assertEqual(t0, T, val, val3)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• save first map again")
	try {
		save_ref_again = await map.save()
		assertNotAnError(t0, T, save_ref_again)
		T.log("√ KVS saved under key " + hex(save_ref_again))
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• third new map")
	try {
		// called map4 because map3 is the retrieved first
		map4 = await pot.new() 
		assertNoError(t0, T, !map4)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from third map")
	try {
		val = await map4.get(key1)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from third map")
	try {
		val = await map4.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 3 in all-new map: will not find it
	T.log("• get " + key3 + " from third map")
	try {
		val = await map4.get(key3)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}


	T.start("Save KVS, re-activate previous, interact, with Promises / Variation")

	key1 = "K1"
	val1 = "V1"
	key2 = "K2"
	val2 = "V2"
	key3 = "K3"
	val3 = "V3"

	try {
		T.log("• new map")
		map = await pot.new()
		assertNoError(t0, T, !map)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup in all-new map: will not find it
	T.log("• get " + key2 + " that should not exist")
	try {
		val = await map.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• save")
	try {
		save_ref = await map.save()
		assertNotAnError(t0, T, save_ref)
		T.log("√ KVS saved under key " + hex(save_ref))
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• new map")
	try {
		map2 = await pot.new()
		assertNoError(t0, T, !map2)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from new map")
	try {
		val = await map2.get(key1)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from new map")
	try {
		val = await map2.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key2 + ": " + val2)
	try {
		err = await map2.put(key2, val2)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key2)
	try {
		val = await map2.get(key2)
		assertEqual(t0, T, val, val2)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• save second map")
	try {
		save_ref_2 = await map2.save()
		assertNotAnError(t0, T, save_ref_2)
		T.log("√ KVS saved under key " + hex(save_ref_2))
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve first map " + hex(save_ref))
	try {
		map3 = await pot.newByReference(save_ref)
		assertNotAnError(t0, T, map3)
		assertNotEqual(t0, T, map3, null)
		/// console.log(map3)
		assertEqual(t0, T, map3.slot_ref, map.slot_ref)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1 + " from first map")
	try {
		val = await map3.get(key1)
		assertEqual(t0, T, val, val1)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in first map: should not find it
	T.log("• get " + key2 + " from first map")
	try {
		val = await map3.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key3 + ": " + val3 + " to first map")
	try {
		err = await map3.put(key3, val3)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key3 + " from first map")
	try {
		val = await map3.get(key3)
		assertEqual(t0, T, val, val3)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• save first map again")
	try {
		save_ref_again = await map.save()
		assertNotAnError(t0, T, save_ref_again)
		T.log("√ KVS saved under key " + hex(save_ref_again))
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• third new map")
	try {
		// called map4 because map3 is the retrieved first
		map4 = await pot.new() 
		assertNoError(t0, T, !map4)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from third map")
	try {
		val = await map4.get(key1)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from third map")
	try {
		val = await map4.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 3 in all-new map: will not find it
	T.log("• get " + key3 + " from third map")
	try {
		val = await map4.get(key3)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve second map " + hexa(save_ref_2))
	try {
		map5 = await pot.newByReference(save_ref_2)
		assertNotAnError(t0, T, map5)
		assertNotEqual(t0, T, map5, null)
		/// console.log(map5)
		assertEqual(t0, T, map5.slot_ref, map2.slot_ref)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in 2nd ('new') map: will not find it
	T.log("• get " + key1 + " from retrieved second map")
	try {
		val = await map5.get(key1)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key2 + " from second map")
	try {
		val = await map5.get(key2)
		assertEqual(t0, T, val, val2)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 3 in 2nd map: will not find it
	T.log("• get " + key3 + " from second map")
	try {
		val = await map5.get(key3)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}


	T.start("Interact with Different Maps, without Savinng, with Promises / Variation")

	key1 = "K1"
	val1 = "V1"
	key2 = "K2"
	val2 = "V2"
	key3 = "K3"
	val3 = "V3"

	T.log("• new map")
	try {
		map = await pot.new()
		assertNoError(t0, T, !map)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup in map: will not find it
	T.log("• get " + key2 + " that should not exist")
	try {
		val = await map.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• new map")
	try {
		map2 = await pot.new()
		assertNoError(t0, T, !map2)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in new map: will not find it
	T.log("• get " + key1 + " from new map")
	try {
		val = await map2.get(key1)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in new map: will not find it
	T.log("• get " + key2 + " from new map")
	try {
		val = await map2.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key2 + ": " + val2)
	try {
		err = await map2.put(key2, val2)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key2 + " from second map")
	try {
		val = await map2.get(key2)
		assertEqual(t0, T, val, val2)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1 + " from first map")
	try {
		val = await map.get(key1)
		assertEqual(t0, T, val, val1)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in first map: should not find it
	T.log("• get " + key2 + " from first map")
	try {
		val = await map.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key3 + ": " + val3 + " to first map")
	try {
		err = await map.put(key3, val3)
		assertNoError(t0, T, err)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key3 + " from first map")
	try {
		val = await map.get(key3)
		assertEqual(t0, T, val, val3)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• third new map")
	try {
		map3 = await pot.new() 
		assertNoError(t0, T, !map3)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from third map")
	try {
		val = await map3.get(key1)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from third map")
	try {
		val = await map3.get(key2)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 3 in all-new map: will not find it
	T.log("• get " + key3 + " from third map")
	try {
		val = await map3.get(key3)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in 2nd new map: will not find it
	T.log("• get " + key1 + " from second map")
	try {
		val = await map2.get(key1)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key2 + " from second map")
	try {
		val = await map2.get(key2)
		assertEqual(t0, T, val, val2)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	// lookup key 3 in 2nd map: will not find it
	T.log("• get " + key3 + " from second map")
	try {
		val = await map2.get(key3)
		assertEqual(t0, T, val, null)
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

}


async function TestPotKvs_ComplexConcurrent(T, bee_url, batch_id) {

	T.head("Concurrent Access")

	if(!bee_url)
	{

		T.start("store and retrieve "+massmax+" values concurrently, sync calls")

		T.log("• new map")
		let map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• store and retrieve "+massmax+" random values under random keys concurrently, parallel sync calls")
		let group = 0
		for(let i=0; i<massmax; i++) {
			; (async() => {
				let t = i+1
				try {
					group++
					let key = pot.randKey()
					let val = pot.randValue()
					let e = map.putSync(key, val)
					assertNoError(t, T, e, true) // suppress ok
					let res = map.getSync(key)
					attestNoError(t, T, true) // suppress ok
					assertEqual(t, T, res, val, true) // suppress ok
					group--
				} catch(err) {
					attestUnexpectedError(t, T, err)
					group--
				}
			})()
		}

		await completion(null, T, ()=>{return group}, 100, 10000)

	}{

		T.start("store and retrieve "+massmax+" values concurrently, awaiting promises")

		timeout = massmax * 100

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		assertNoError(t0, T, !map)

		T.log("• store and retrieve "+massmax+" random values under random keys concurrently, awaiting promises")
		let group = 0
		for(let i=0; i<massmax; i++) {
			; (async() => {
				let t = i+1
				let box = T.box 
				try {
					group++
					let key = pot.randKey()
					let val = pot.randValue()
					let e = await map.put(key, val)
					assertNoError(t, T, e, true, box) // suppress ok
					let res = await map.get(key)
					attestNoError(t, T, true, box) // suppress ok
					assertEqual(t, T, res, val, true, box) // suppress ok
					group--
				} catch(err) {
					attestUnexpectedError(t, T, err, box)
					group--
				}
			})()
		}

		await completion(null, T, ()=>{return group}, 1000, timeout)

	}{

		T.start("Concurrent Putting, Getting, Saving and Loading, Switching Maps, with Promises")

		key1 = "K1"
		val1 = "V1"
		key2 = pot.randKey()
		val2 = pot.randValue()
		key3 = pot.randKey()
		val3 = pot.randValue()
		let group = 0

		; (async ()=>{

			group++
			let t = 1

			T.log(1, "• new map")
			try {
				map = await pot.new()
				attestNoError(t, T, !map)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• put " + key1 + ": " + val1)
			try {
				err = await map.put(key1, val1)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1)
			try {
				val = await map.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• save")
			try {
				save_ref = await map.save()
				assertNotAnError(t, T, save_ref)
				T.log(t, "√ KVS saved under key " + hex(save_ref))
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• put " + hexa(key2) + ": " + hexa(val2))
			try {
				err = await map.put(key2, val2)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + hexa(key2))
			try {
				val = await map.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• retrieve first map as saved as " + hex(save_ref))
			try {
				map3 = await pot.newByReference(save_ref)
				assertNotAnError(t, T, map3)
				assertNotEqual(t, T, map3, null)
				/// console.log(map3)
				assertEqual(t, T, map3.slot_ref, map.slot_ref)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from retrieved map")
			try {
				val = await map3.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from original map")
			try {
				val = await map3.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from retrieved map again")
			try {
				val = await map3.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + hexa(key2) + " from original map")
			try {
				val = await map3.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in retrieved map: will not find it
			T.log(1, "• get " + hexa(key2) + " from retrieved map")
			try {
				val = await map3.get(key2)
				assertEqual(1, T, val, val2)
			} catch(err) {
				attestUnexpectedError(1, T, err)
			}

			T.log(1, "• put " + hexa(key2) + ": " + hexa(val2) + " to retrieved map")
			try {
				err = await map3.put(key2, val2)
				assertNoError(1, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + hexa(key2) + " from retrieved map")
			try {
				val = await map3.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			group--
		})()

		; (async ()=>{

			group++
			let t = 2

			T.log(t, "• second new map")
			try {
				map2 = await pot.new()
				assertNoError(t, T, !map2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup in all-new map: will not find it
			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map2.get(key1)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key1 + ": " + val1)
			try {
				err = await map2.put(key1, val1)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1)
			try {
				val = await map2.get(key1) /// xxx
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in 2nd map: will not find it
			T.log(t, "• get " + hexa(key2) + " from 2nd (new) map")
			try {
				val = await map2.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t0, T, err)
			}

			T.log(t, "• put " + hexa(key2) + ": " + hexa(val2) + " to 2nd map")
			try {
				err = await map2.put(key2, val2)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + hexa(key2) + " from 2nd map")
			try {
				val = await map2.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			group--
		})()

		await completion(null, T, ()=>{return group}, 100, 1000)

	}{

		T.start("Crossover Concurrent Putting, Getting, Saving and Loading, Switching Maps across threads, with Promises")

		key1 = "K1"
		val1 = "V1"
		key2 = pot.randKey()
		val2 = pot.randValue()
		key3 = pot.randKey()
		val3 = pot.randValue()

		// key2 etc from before, random bytes
		let group = 0

		; (async ()=>{

			group++
			let t = 1

			T.log(1, "• new map")
			try {
				map = await pot.new()
				attestNoError(t, T, !map)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• put " + key1 + ": " + val1)
			try {
				err = await map.put(key1, val1)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1)
			try {
				val = await map.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• save")
			try {
				save_ref = await map.save()
				assertNotAnError(t, T, save_ref)
				T.log(t, "√ KVS saved under key " + hex(save_ref))
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• put " + hexa(key2) + ": " + hexa(val2))

			try {
				err = await map.put(key2, val2)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + hexa(key2))
			try {
				val = await map.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• retrieve first map as saved as " + hex(save_ref))
			try {
				map3 = await pot.newByReference(save_ref)
				assertNotAnError(t, T, map3)
				assertNotEqual(t, T, map3, null)
				/// console.log(map3)
				assertEqual(t, T, map3.slot_ref, map.slot_ref)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from retrieved map")
			try {
				val = await map3.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from original map")
			try {
				val = await map3.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from retrieved map again")
			try {
				val = await map3.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + hexa(key2) + " from original map")
			try {
				val = await map3.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in retrieved map: will not find it
			T.log(1, "• get " + hexa(key2) + " from retrieved map")
			try {
				val = await map3.get(key2)
				assertEqual(1, T, val, val2)
			} catch(err) {
				attestUnexpectedError(1, T, err)
			}

			T.log(1, "• put " + hexa(key2) + ": " + hexa(val2) + " to retrieved map")
			try {
				err = await map3.put(key2, val2)
				assertNoError(1, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + hexa(key2) + " from retrieved map")
			try {
				val = await map3.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			group--
		})()

		; (async ()=>{

			group++
			let t = 2

			T.log(t, "• second new map")
			try {
				map2 = await pot.new()
				assertNoError(t, T, !map2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup in all-new map: will not find it
			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map2.get(key1)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key1 + ": " + val1 + " to second map")
			try {
				err = await map2.put(key1, val1)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map2.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			/// GETTING FROM FIRST MAP
			T.log(t, "• get " + key1 + " from FIRST map")
			try {
				val = await map.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in 2nd map: will not find it
			T.log(t, "• get " + hexa(key2) + " from 2nd (new) map")
			try {
				val = await map2.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t0, T, err)
			}

			T.log(t, "• put " + hexa(key2) + ": " + hexa(val2) + " to 2nd map")
			try {
				err = await map2.put(key2, val2)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + hexa(key2) + " from 2nd map")
			try {
				val = await map2.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			group--
		})()

		await completion(null, T, ()=>{return group}, 100, 1000)

	}{

		T.start("Concurrent save of KVS, re-activate previous, interact, with Promises / Variation")

		key1 = "K1"
		val1 = "V1"
		key2 = "K2"
		val2 = "V2"
		key3 = "K3"
		val3 = "V3"

		let map
		let map2
		let map3
		let map4
		let map5

		group = 0

		; (async () => {

			T.log("» first thread")
			group++
			let t = 1

			T.log(t, "• new map")
			try {
				map = await pot.new()
				assertNoError(t, T, !map)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key1 + ": " + val1)
			try {
				err = await map.put(key1, val1)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1)
			try {
				val = await map.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup in all-new map: will not find it
			T.log(t, "• get " + key2 + " that should not exist")
			try {
				val = await map.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• save")
			try {
				save_ref = await map.save()
				assertNotAnError(t, T, save_ref)
				T.log(t, "√ KVS saved under key " + hex(save_ref))
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• retrieve first map " + hex(save_ref))
			try {
				map3 = await pot.newByReference(save_ref)
				assertNotAnError(t, T, map3)
				assertNotEqual(t, T, map3, null)
				/// console.log(map3)
				assertEqual(t, T, map3.slot_ref, map.slot_ref)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1 + " from retrieved first map")
			try {
				val = await map3.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in retrieved map: should not find it
			T.log(t, "• get " + key2 + " from retrieved first map")
			try {
				val = await map3.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key3 + ": " + val3 + " to retrieved first map")
			try {
				err = await map3.put(key3, val3)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key3 + " from retrieved first map")
			try {
				val = await map3.get(key3)
				assertEqual(t, T, val, val3)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• save first map again")
			try {
				save_ref_again = await map.save()
				assertNotAnError(t, T, save_ref_again)
				T.log(t, "√ KVS saved under key " + hex(save_ref_again))
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}
			group--
		})()

		; (async () => {

			group++
			let t = 2

			T.log(t, "» second thread")

			T.log(t, "• second new map")
			try {
				map2 = await pot.new()
				assertNoError(t, T, !map2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in all-new map: will not find it
			T.log(t, "• get " + key1 + " from new map")
			try {
				val = await map2.get(key1)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in all-new map: will not find it
			T.log(t, "• get " + key2 + " from new map")
			try {
				val = await map2.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key2 + ": " + val2)
			try {
				err = await map2.put(key2, val2)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key2)
			try {
				val = await map2.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• save second map")
			try {
				save_ref_2 = await map2.save()
				assertNotAnError(t, T, save_ref_2)
				T.log(t, "√ KVS saved under key " + hex(save_ref_2))
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• retrieve second map " + hexa(save_ref_2))
			try {
				map5 = await pot.newByReference(save_ref_2)
				assertNotAnError(t, T, map5)
				assertNotEqual(t, T, map5, null)
				/// console.log(map5)
				assertEqual(t, T, map5.slot_ref, map2.slot_ref)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in 2nd new map: will not find it
			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map5.get(key1)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key2 + " from second map")
			try {
				val = await map5.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 3 in all-new map: will not find it
			T.log(t, "• get " + key3 + " from second map")
			try {
				val = await map5.get(key3)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}
			group--
		})()

		; (async () => {

			group++
			let t = 3

			T.log(t, "» third thread")

			T.log(t, "• third new map")
			try {
				// called map4 because map3 is the retrieved first
				map4 = await pot.new() 
				assertNoError(t, T, !map4)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in all-new map: will not find it
			T.log(t, "• get " + key1 + " from third map")
			try {
				val = await map4.get(key1)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in all-new map: will not find it
			T.log(t, "• get " + key2 + " from third map")
			try {
				val = await map4.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 3 in all-new map: will not find it
			T.log(t, "• get " + key3 + " from third map")
			try {
				val = await map4.get(key3)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}
			group--
		})()

		await completion(null, T, ()=>{return group}, 100, 1000)

	}{

		T.start("Interact with Different Maps, without Savinng, with Promises / Variation")

		key1 = "K1"
		val1 = "V1"
		key2 = "K2"
		val2 = "V2"
		key3 = "K3"
		val3 = "V3"

		let group = 0

		; (async () => {

			group++
			let t=1

			T.log(t, "• new map")
			try {
				map = await pot.new()
				assertNoError(t, T, !map)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key1 + ": " + val1)
			try {
				err = await map.put(key1, val1)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1)
			try {
				val = await map.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup in all-new map: will not find it
			T.log(t, "• get " + key2 + " that should not exist")
			try {
				val = await map.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1 + " from first map")
			try {
				val = await map.get(key1)
				assertEqual(t, T, val, val1)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in new map: should not find it
			T.log(t, "• get " + key2 + " from first map")
			try {
				val = await map.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key3 + ": " + val3 + " to first map")
			try {
				err = await map.put(key3, val3)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key3 + " from first map")
			try {
				val = await map.get(key3)
				assertEqual(t, T, val, val3)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			group--
		})()

		; (async () => {

			group++
			let t=2

			T.log(t, "• new map")
			try {
				map2 = await pot.new()
				assertNoError(t, T, !map2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in all-new map: will not find it
			T.log(t, "• get " + key1 + " from new map")
			try {
				val = await map2.get(key1)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in all-new map: will not find it
			T.log(t, "• get " + key2 + " from new map")
			try {
				val = await map2.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key2 + ": " + val2)
			try {
				err = await map2.put(key2, val2)
				assertNoError(t, T, err)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key2 + " from second map")
			try {
				val = await map2.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in 2nd new map: will not find it
			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map2.get(key1)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key2 + " from second map")
			try {
				val = await map2.get(key2)
				assertEqual(t, T, val, val2)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 3 in all-new map: will not find it
			T.log(t, "• get " + key3 + " from second map")
			try {
				val = await map2.get(key3)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			group--

		})()

		; (async () => {

			group++
			let t=3

			T.log(t, "• third new map")
			try {
				map3 = await pot.new() 
				assertNoError(t, T, !map3)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in all-new map: will not find it
			T.log(t, "• get " + key1 + " from third map")
			try {
				val = await map3.get(key1)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in all-new map: will not find it
			T.log(t, "• get " + key2 + " from third map")
			try {
				val = await map3.get(key2)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			// lookup key 3 in all-new map: will not find it
			T.log(t, "• get " + key3 + " from third map")
			try {
				val = await map3.get(key3)
				assertEqual(t, T, val, null)
			} catch(err) {
				attestUnexpectedError(t, T, err)
			}

			group--
		})()

		await completion(null, T, ()=>{return group}, 100, 2000)

	}
}

function TestPotKvs_Proof(T, bee_url, batch_id) {

	T.head("Proofs")


	T.start("Return a Proof")

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	T.log("• get proof for " + key1)
	val = map.getProof(key1)
	assertEqual(t0, T, val, null)

}

async function TestPotKvs_Cancellation(T, bee_url, batch_id) {

	T.head("Cancellation")
	T.log("This tests the cancellable promises created in Go to control resource leakage.")


	T.start("Time Out of Test Function")

	T.log("create hanging test promise and let it time out (try-catch)")
	try {
		ref = await pot.hangingPromise()
		attestMissingError(t, T)
	} catch(err) {
		attestExpectedError(t0, T, err, "Error: done sleeping, nothing happened")
	}


	T.start("Time Out of Test Function II")

	T.log("create hanging test promise and let it time out (chained catch)")
	ref = await pot.hangingPromise()
		.catch((err)=>attestExpectedError(t0, T, err, "Error: done sleeping, nothing happened"))


	T.start("Cancel Timer")

	T.log("create hanging test promise and cancel it (by timer, try-catch)")
	try {
		ref = pot.hangingPromise()
		setTimeout(ref.cancel, 500)
		await ref
		attestMissingError(t, T)
	} catch(err) {
		attestExpectedError(t0, T, err, "Error: canceled")
	}


	T.start("Cancel Timer II")

	T.log("create hanging test promise and cancel it (by timer, chain .catch)")
	try {
		ref = pot.hangingPromise()
		setTimeout(ref.cancel, 500)
		// note, don't chain the .catch above to get the wrong ref. 
		await ref.catch((err)=>attestExpectedError(t0, T, err, "Error: canceled"))
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}


	T.start("Cancel Delay")

	T.log("create hanging test promise and cancel it (delay, chain .catch)")
	try {
		ref = pot.hangingPromise()
		// note, don't chain the .catch above to get the wrong ref. 
		ref.catch((err)=>attestExpectedError(t0, T, err, "Error: canceled"))
		await delay(500)
		ref.cancel()
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

	await delay(700)

/* Does not work, although X1 does. Throughs Uncaught (in promise) Error: canceled

	T.start("Immediate Cancel")

	T.log("create hanging test promise and cancel it immediately (try-catch)")
	try {
		ref = pot.hangingPromise()
		ref.cancel()
		// also does not work with 500ms delay here
		attestMissingError(t, T)
	} catch(err) {
		attestExpectedError(t0, T, err, "Error: canceled")
	}
*/

	T.start("Immediate Cancel II")

	T.log("create hanging test promise and cancel it immediately (chain .catch)")
	try {
		ref = pot.hangingPromise()
		// note, don't chain the .catch above to get the wrong ref. 
		ref.catch((err)=>attestExpectedError(t0, T, err, "Error: canceled"))
		ref.cancel()
	} catch(err) {
		attestUnexpectedError(t0, T, err)
	}

}

async function TestPotKvs_MassSequential(T, bee_url, batch_id) {

	T.head("Mass Access")

	if(bee_url) {
		T.log("No sequential case in network mode.")
		return
	}

	T.start("store and retrieve "+massmax+" values sequentially")

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = map.putSync(key, val)
		assertNotAnError(t0, T, e, true) // suppress ok
	}
	attestNoError(t0, T)

	T.log("• retrieve "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		val = map.getSync(k[i])
		assertEqual(t0, T, val, v[i], true) // suppress ok
	}
	attestNoError(t0, T)

}

// Testing failure modes: internal error (returned), and Go panic.
async function TestPotKvs_Failures(T, bee_url, batch_id) {

	T.head("Failures", pot.testMode() != "extended")

	if(pot.testMode() != "extended") {
		T.log("Failure tests are available in extended API test mode. Run `$make xt`.")
		return
	}

	// (This comes out as note right under the case head)
	T.log("Testing wether all error condition types are contained and don't bring down the Go executable.")


	T.start("pot initialization failure")

	T.log("Using pot before wasm streaming initialization is complete.")
	T.log("NOTE THAT THIS TEST MIGHT FAIL without good cause if the" +
		" streaming completes so fast that the test cannot interject.")
	T.log(" This test adds the information how the error looks if the" +
		" failure happens, and that the test code as an example can" +
		" catch it.")
	{

		const go = new Go()
		potbak = pot
		pot = {}

		pot.start = new Promise((resolve, reject) => {
			WebAssembly.instantiateStreaming(fetch("pot.wasm"), go.importObject)
				.then((r) => { go.run(r.instance) ; resolve(pot) })
				.catch((e) => { reject(e) })
		})

		pot.ready = () => { return pot.start }

		// too early, fail. MIGHT SOMETIMES SUCCEED:
		// In case this error unintentionally succeeds,
		// cut it.
		T.log("• new map (first attempt, before pot is ready)")
		try {
			pot.newSync(bee_url, batch_id)
			attestMissingError(t0, T)
		} catch(err) {
			attestExpectedError(t0, T, err)
		}

		await pot.ready()

		// .. should work now
		T.log("• new map (second attempt, after pot is ready)")
		try {
			pot.newSync(bee_url, batch_id)
			attestNoError(t0, T)
		} catch(err) {
			attestUnexpectedError(t0, T, err)
		}

		// re original instance
		pot = potbak
	}


	T.start("new map creation failure conditions")

	// happy path
	T.log("• new map, synchronous happy path")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	// fail synchronously
	pot.setFail(true)
	T.log("• new map synchronous call failure")
	map = pot.newSync(bee_url, batch_id)
	assertError(t0, T, map)

	// fail asynchronously
	pot.setFail(true)
	T.log("• new map asynchronous call failure")
	try {
		map = await pot.new()
		attestMissingError(t0, T)
	} catch(err) {
		attestExpectedError(t0, T, err)
	}

	// panic synchronously
	pot.setPanic(true)
	T.log("• new map synchronous call panic")
	map = pot.newSync(bee_url, batch_id)
	assertError(t0, T, map)

	// panic asynchronously
	pot.setPanic(true)
	T.log("• new map asynchronous call panic")
	try {
		map = await pot.new()
		attestMissingError(t0, T)
	} catch(err) {
		attestExpectedError(t0, T, err)
	}


	T.start("put - failure conditions")

	key1 = "kappa 1"
	val1 = "gamma 1"

	// happy path
	T.log("• new map, synchronous")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	assertNoError(t0, T, err)

	// fail raw synchronously
	pot.setFail(true)
	T.log("• put raw - synchronous call failure")
	err = map.putRawSync(key1, val1)
	assertError(t0, T, err, /mock fail/)

	// fail typed synchronously
	pot.setFail(true)
	T.log("• put typed - synchronous call failure")
	err = map.putSync(key1, val1)
	assertError(t0, T, err, /mock fail/)

	// fail typed asynchronously
	pot.setFail(true)
	T.log("• put typed - asynchronous (promise) call failure")
	try {
		err = await map.put(key1, val1)
		attestMissingError(t0, T)
	} catch(err) {
		assertError(t0, T, err, /mock fail/)
	}

	// panic raw synchronously
	pot.setPanic(true)
	T.log("• put raw - panic")
	err = map.putRawSync(key1, val1)
	assertError(t0, T, err, /mock panic/)

	// panic typed synchronously
	pot.setPanic(true)
	T.log("• put typed -  synchronous call panic")
	err = map.putSync(key1, val1)
	assertError(t0, T, err, /mock panic/)

	// panic asynchronously
	pot.setPanic(true)
	T.log("• put typed - asynchronous call panic")
	try {
		err = await map.put(key1, val1)
		attestMissingError(t0, T)
	} catch(err) {
		assertError(t0, T, err, /mock panic/)
	}


	T.start("put - parameter error")

	T.log("• new map, synchronous")
	map = pot.newSync(bee_url, batch_id)
	assertNoError(t0, T, !map)

	// 1 less

	// fail raw synchronously
	T.log("• put raw, synchronous - missing value parameter")
	err = map.putRawSync(key1)
	assertError(t0, T, err, /parameter count.*requires 2, got 1/)

	// fail typed synchronously
	T.log("• put typed, synchronous - missing value parameter")
	err = map.putSync(key1)
	assertError(t0, T, err, /parameter count.*requires 2, got 1/)

	// fail typed asynchronously
	T.log("• put typed, asynchronous (promise) - missing value parameter")
	try {
		err = await map.put(key1)
		attestMissingError(t0, T)
	} catch(err) {
		assertError(t0, T, err, /parameter count.*requires 2, got 1/)
	}

	// 2 less

	// fail raw synchronously
	T.log("• put raw, synchronous - missing both parameters")
	err = map.putRawSync()
	assertError(t0, T, err, /parameter count.*requires 2, got 0/)

	// fail typed synchronously
	T.log("• put typed, synchronous - missing both parameters")
	err = map.putSync()
	assertError(t0, T, err, /parameter count.*requires 2, got 0/)

	// fail typed asynchronously
	T.log("• put typed, asynchronous (promise) - missing both parameters")
	try {
		err = await map.put()
		attestMissingError(t0, T)
	} catch(err) {
		assertError(t0, T, err, /parameter count.*requires 2, got 0/)
	}

}


