### Tests

A standard test can be made with make

    make test

A standard test can be made with make

    make nodetest

A standard test can be made with make

    make webtest

For more rules see below.

Check out the chapter regarding tests in the [manual](../doc/POT_JS_manual.pdf).


### Tests can run in 2x3x2 modes:


  The jest installation test suite is run by:

    % make test

  Deep regression tests can be run in ~2x3x3 combinable deep test modes:

  browser/node x in-memory/simulated/network x standard/stress/memory.

  The deep test rules are accordingly composed from three tags. For example:

    % make node_inmem_stress

  Meaning     Tag     |  Description
  --------------------+----------------------------------------------------------
  browser     web     |  Javascript running in the browser
  node.js     node    |  Javascript running in the terminal using node.js
  --------------------+----------------------------------------------------------
  in-memory   inmem   |  non-persistent, in-memory storage
  simulated   sim     |  simulated storage for testing exceptions
  network     locnet  |  local Swarm network storage
  --------------------+----------------------------------------------------------
  standard    test    |  31 test suites of various flavors
  recycle ID  quick   |  like *_locnet_test but re-using the batch id
  stress      stress  |  4 longer-running suites; mass & concurrent access
  memory      memory  |  9 long-running suites testing for memory leaks


  These are the resulting test rules (for other rules use % make help):

  Rule                |  Description
  --------------------+----------------------------------------------------------
  test                |  explain test modes and run jest test suite
  jest                |  run installation test suite w/o test mode explanation
  nodetest            |  explain test modes and run node_inmem_test
  webtest             |  explain test modes and run web_inmem_test
  --------------------+----------------------------------------------------------
  web_inmem_test      |  browser tests with go pot in-memory persisting
  web_inmem_stress    |  browser stress tests with go pot in-memory persisting
  web_sim_test        |  browser exceptions tests w/out go pot connection
  web_locnet_test     |  browser tests with a locally installed Swarm network
  web_locnet_quick    |  like web_locnet_test but re-using the last batch id
  web_locnet_stress   |  browser stress tests with a locally installed Swarm network
  node_inmem_test     |  node.js tests with go pot in-memory persisting
  node_inmem_stress   |  node.js stress tests with go pot in-memory persisting
  node_inmem_memory   |  node.js memory leak tests with go pot in-memory persisting
  node_sim_test       |  node.js exceptions tests w/out go pot connection
  node_sim_memory     |  node.js memory leak tests w/out go pot connection
  node_locnet_test    |  node.js tests with a locally installed Swarm network
  node_locnet_quick   |  like node_locnet_test but re-using the last batch id
  node_locnet_stress  |  node.js stress tests with a locally installed Swarm network
  node_locnet_memory  |  node.js memory leak tests with a locally installed Swarm network

  All node_* tests are run on push by github CI workloads, except *_quick and *_memory.
  CI runs all those tests for ubuntu-latest, and all non-locnet for MacOS.

  memory leak tests run only with node.js as they are only relevant for servers.

  Individual memory leak test cases can be picked via names, e.g.:

    % make node_inmem_memory TEST="gc-response,gc-kvs-detection"

  gc-response            check whether the Javascript GC can be triggered
  gc-kvs-detection       check whether the collection of a kvs is detectable
  gc-kvs-creation        leak-test sync kvs creation
  gc-put-sync	          leak-test sync put with counter as key and value
  gc-put-async	          leak-test async put with negative of counter as key and value
  gc-get-async-fix       leak-test async get of value for fix key "K"
  gc-put-get-sync        leak-test sync put, get of random keys and values
  gc-put-get-async       leak-test async put, get of random keys and values
  gc-put-get-async-del   leak-test async put, get, delete of random keys and values
  gc-basics-sync         leak-test sync put, get, save, load, get, delete
  gc-basics-async        leak-test async put, get, save, load, get, delete
  gc-multiop1-async      leak-test 3x async put, get, save, load, get, delete, get
  gc-multiop2-async      leak-test 3x async put, get, delete, get

  The number of iterations can also be adjusted. Below 50,000 is less usefull. E.g.:

    % make node_sim_memory TEST="gc-kvs-creation" ITER=20000

  ITER works only when TEST is given. Verbosity can be set with VERB.
  VERB works only if ITER is given.

  Continuous Integration runs these tests on push to github (.github/workflow):

  inst-tests-macos.yml:           make jest_test
  inst-tests-ubuntu.yml:          make jest_test
  inmem-tests-macos.yml:          make node_inmem_test
  inmem-tests-ubuntu.yml:         make node_inmem_test
  inmem-memory-macos.yml:         make node_inmem_memory
  inmem-memory-ubuntu.yml:        make node_inmem_memory
  sim-tests-macos.yml:            make node_sim_test
  sim-tests-ubuntu.yml:           make node_sim_test
  sim-memory-macos.yml:           make clean node_sim_memory
  sim-memory-ubuntu.yml:          make clean node_sim_memory
  stress-tests-macos.yml:         make clean node_inmem_stress
  stress-tests-ubuntu.yml:        make node_inmem_stress
  stress-tests-ubuntu.yml:        make node_locnet_stress
  locnet-memory-put1-ubuntu.yml:  make node_locnet_memory TEST=gc-put-sync
  locnet-memory-put2-ubuntu.yml:  make node_locnet_memory TEST=gc-put-async
  locnet-memory-get1-ubuntu.yml:  make node_locnet_memory TEST=gc-get-async-fix
  locnet-memory-get2-ubuntu.yml:  make node_locnet_memory TEST=gc-put-get-sync
  locnet-memory-get3-ubuntu.yml:  make node_locnet_memory TEST=gc-put-get-async
  locnet-memory-ops1-ubuntu.yml:  make node_locnet_memory TEST=gc-basics-sync
  locnet-memory-ops2-ubuntu.yml:  make node_locnet_memory TEST=gc-basics-async
  locnet-memory-ops3-ubuntu.yml:  make node_locnet_memory TEST=gc-multiop1-async ITER=10000 (*)
  locnet-memory-ops4-ubuntu.yml:  make node_locnet_memory TEST=gc-multiop2-async ITER=30000
  locnet-tests-ubuntu.yml:        make node_locnet_test

  (*) ops3 is too long-running when used with 50,000 iterations and the CI therefore
  subject to ongoing changes.

  CI results are at https://github.com/brainiac-five/potjs/actions.


