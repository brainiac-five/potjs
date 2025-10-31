### Tests

A standard test can be made with make

    make test


Check out the chapter regarding tests in the [manual](../doc/POT_JS_manual.pdf).


### Tests can run in 2x3x2 modes:

    browser / node | in-memory / simulated / network | standard / stress.

    browser    web     |  Javascript running in the browser
    node       node    |  Javascript running in the terminal using node.js
    -------------------+--------------------------------------------------
    in-memory  inmem   |  non-persistent, in-memory storage
    simulated  sim     |  simulated storage for testing exceptions
    network    locnet  |  local Swarm network storage
    -------------------+--------------------------------------------------
    standard   test    |  153 test suites of various flavors
               quick   |  like *_locnet_test but re-using the batch id
    stress     stress  |  4 longer-running suites; mass & concurrent access

    The following are the make rules (for other rules use % make help):

    test               |  explain test modes and run node_inmem_test
    webtest            |  explain test modes and run web_inmem_test
    web_inmem_test     |  test api interaction with go pot in-memory persisting, web
    web_inmem_stress   |  stress test with go pot in-memory persisting, web
    web_sim_test       |  extended exceptions tests w/out go pot connection, web
    web_locnet_test    |  standard tests with a locally installed Swarm network, web
    web_locnet_quick   |  like web_locnet_test but re-using the last batch id, web
    web_locnet_stress  |  stress test with a locally installed Swarm network, web
    node_inmem_test    |  test api interaction with go pot in-memory persisting, node
    node_inmem_stress  |  stress test with go pot in-memory persisting, node
    node_sim_test      |  extended exceptions tests w/out go pot connection, node
    node_locnet_test   |  test with a locally installed Swarm network, node
    node_locnet_quick  |  like node_locnet_test but re-using the last batch id, node
    node_locnet_stress |  stress test with a locally installed Swarm network, node

    All node_* tests are run on push by github CI workloads, except *_quick.
    CI runs all those tests for ubuntu-latest, and all non-locnet for MacOS.

