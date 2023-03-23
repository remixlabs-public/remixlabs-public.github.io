/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) scriptUrl = scripts[scripts.length - 1].src
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ../hub-client/src/index.js

      function getAbsoluteUrl(relativeUrl) {
        const publicPath = __webpack_require__.p;

        let url = '';

        if (!publicPath || publicPath.indexOf('://') < 0) {
          url += window.location.protocol + '//' + window.location.host;
        }

        if (publicPath) {
          url += publicPath;
        } else {
          url += '/';
        }

        return url + relativeUrl;
      }
let terminate = function(f) {};
if (globalThis.ThisIsNode) {
    terminate = function(f) {
        Process.on("exit", () => {
            console.log("terminating hub worker");
            f()
        })
    }
};

class JSONMessage {
    constructor(rmxType, sender, payload) {
        this.rmxType = rmxType;
        this.sender = sender;
        this.payload = typeof(payload) === "string" ? JSON.parse(payload) : payload;
        this.eof = false;
        this.localOnly = false
    }

    publish(reqId, topic, retained) {
        return { _rmx_type: "msg_hub_publish",
                 header: { _rmx_type: this.rmxType,
                           _rmx_encoding: "json",
                           _rmx_sender: this.sender
                         },
                 reqId: reqId,
                 topic: topic,
                 payload: JSON.stringify(this.payload),
                 retained: retained,
                 localOnly: false
               }
    }
}

class TextMessage {
    constructor(rmxType, sender, payload) {
        this.rmxType = rmxType;
        this.sender = sender;
        this.payload = payload;
        this.eof = false;
        this.localOnly = false
    }

    publish(reqId, topic, retained) {
        return { _rmx_type: "msg_hub_publish",
                 header: { _rmx_type: this.rmxType,
                           _rmx_encoding: "text",
                           _rmx_sender: this.sender
                         },
                 reqId: reqId,
                 topic: topic,
                 payload: this.payload,
                 retained: retained,
                 localOnly: false
               }
    }
}

class BinaryMessage {
    constructor(rmxType, sender, payload) {
        this.rmxType = rmxType;
        this.sender = sender;
        this.payload = payload;
        this.eof = false;
        this.localOnly = false
    }

    publish(reqId, topic, retained) {
        return { _rmx_type: "msg_hub_publish",
                 header: { _rmx_type: this.rmxType,
                           _rmx_encoding: "binary",
                           _rmx_sender: this.sender
                         },
                 reqId: reqId,
                 topic: topic,
                 payload: this.payload,
                 retained: retained,
                 localOnly: false
               }
    }
}

class LocalMessage {
    constructor(rmxType, sender, payload) {
        this.rmxType = rmxType;
        this.sender = sender;
        this.payload = payload;
        this.eof = false;
        this.localOnly = true
    }

    publish(reqId, topic, retained) {
        return { _rmx_type: "msg_hub_publish",
                 header: { _rmx_type: this.rmxType,
                           _rmx_encoding: "local",
                           _rmx_sender: this.sender
                         },
                 reqId: reqId,
                 topic: topic,
                 payload: this.payload,
                 retained: retained,
                 localOnly: true
               }
    }
}

class EOF {
    constructor() {
        this.rmxType = "";
        this.sender = "";
        this.payload = null;
        this.eof = true;
        this.localOnly = false
    }
}

function decodeMessage(msg) {
    if (msg.eof) {
        return new EOF()
    };
    switch (msg.header._rmx_encoding) {
    case "text":
        return new TextMessage(msg.header._rmx_type,
                               msg.header._rmx_sender,
                               msg.payload)
    case "json":
        return new JSONMessage(msg.header._rmx_type,
                               msg.header._rmx_sender,
                               msg.payload)
    case "binary":
        return new BinaryMessage(msg.header._rmx_type,
                                 msg.header._rmx_sender,
                                 msg.payload)
    case "local":
        return new LocalMessage(msg.header._rmx_type,
                                msg.header._rmx_sender,
                                msg.payload)
    default:
        throw new Error("bad _rmx_encoding: " + msg.header._rmx_encoding)
    }
}

class Subscription {
    constructor(channel, topic, subId) {
        this.channel = channel;
        this.topic = topic;
        this.subId = subId;
        this.buffer = new Array();
        this.eof = false;
        this.notify = (() => null);
        channel.expect.set(subId, (resp => {
            if (resp.data.error != null) {
                console.warn("got an unexpected error message: " + resp.data.error)
            } else {
                this.buffer.push(decodeMessage(resp.data));
                this.eof = this.eof || resp.data.eof;
                this.notify()
            }
        }))
    }
    next() {
        return new Promise((resolve, reject) => {
            if (this.buffer.length > 0) {
                resolve(this.buffer.shift())
            } else {
                this.notify = (() => {
                    this.notify = (() => null);
                    if (this.buffer.length > 0) {
                        resolve(this.buffer.shift())
                    }
                })
            }
        })
    }

    unsubscribe() {
        return new Promise((resolve, reject) => {
            let reqId = this.channel.reqId + 1;
            this.channel.reqId = reqId;
            this.channel.expect.set(reqId, (resp => {
                this.channel.expect.delete(reqId);
                if (resp.data.error == null) {
                    this.channel.expect.delete(this.subId);
                    resolve(resp.data)
                } else
                    reject(resp.data);
            }));
            let unsubMsg =
                { _rmx_type: "msg_hub_unsubscribe",
                  topic: this.topic,
                  reqId: reqId,
                  subId: this.subId
                };
            this.channel.port.postMessage(unsubMsg)
        })
    }
}

// The class Channel connects to the web worker implementing the hub.
// If you want to send channels to further web workers, you can do so
// by sending the port as transferable object, e.g.
//    otherWorker.postMessage(..., [ channel.port ])
// and in the implementation of onmessage of otherWorker restore the channel:
//    onmessage(ev => { let channel = new Channel(ev.ports[0]) ... })
// The restored channel talks then to the same hub.
class Channel {
    constructor(port) {
        this.port = port;
        this.expect = new Map();
        this.reqId = 0;

        this.port.onmessage = (ev => {
            let f = this.expect.get(ev.data.reqId);
            f(ev)
        })
    }

    publish(topic, msg, retained) {
        return new Promise((resolve, reject) => {
            let reqId = this.reqId + 1;
            this.reqId = reqId;
            this.expect.set(reqId, (resp => {
                this.expect.delete(reqId);
                if (resp.data.error == null)
                    resolve(null);
                else
                    reject(resp.data);
            }));
            let publishMsg = msg.publish(reqId, topic, retained);
            this.port.postMessage(publishMsg)
        })
    }

    subscribe(topic) {
        return new Promise((resolve, reject) => {
            let reqId = this.reqId + 1;
            let subId = reqId + 1;
            this.reqId = subId;
            let sub = new Subscription(this, topic, subId);
            this.expect.set(reqId, (resp => {
                this.expect.delete(reqId);
                if (resp.data.error == null)
                    resolve(sub);
                else
                    reject(resp.data);
            }));
            let subMsg =
                { _rmx_type: "msg_hub_subscribe",
                  topic: topic,
                  reqId: reqId,
                  subId: subId
                };
            this.port.postMessage(subMsg)
        })
    }

    setLocalPubTopic(topic) {
        return new Promise((resolve, reject) => {
            let reqId = this.reqId + 1;
            this.reqId = reqId;
            this.expect.set(reqId, (resp => {
                this.expect.delete(reqId);
                if (resp.data.error == null)
                    resolve(null);
                else
                    reject(resp.data);
            }));
            let m = { _rmx_type:"msg_hub_setLocalPubTopic",
                      topic: topic,
                      reqId: reqId
                    };
            this.port.postMessage(m)
        })
    }

    setLocalSubTopic(topic) {
        return new Promise((resolve, reject) => {
            let reqId = this.reqId + 1;
            this.reqId = reqId;
            this.expect.set(reqId, (resp => {
                this.expect.delete(reqId);
                if (resp.data.error == null)
                    resolve(null);
                else
                    reject(resp.data);
            }));
            let m = { _rmx_type:"msg_hub_setLocalSubTopic",
                      topic: topic,
                      reqId: reqId
                    };
            this.port.postMessage(m)
        })
    }

    newChannel() {
        return new Promise((resolve, reject) => {
            let reqId = this.reqId + 1;
            this.reqId = reqId;
            this.expect.set(reqId, (resp => {
                this.expect.delete(reqId);
                if (resp.data.error == null) {
                    let port = resp.ports !== undefined ? resp.ports[0] : resp.dara.port;
                    let hubch = new Channel(port);
                    resolve(hubch);
                } else
                    reject(resp.data)
            }));
            let msg =
                { "_rmx_type": "msg_hub_newChannel" };
            this.port.postMessage(msg);
        })
    }

    newJSONMessage(rmxType, sender, payload) {
        return new JSONMessage(rmxType, sender, payload);
    }

    newTextMessage(rmxType, sender, payload) {
        return new TextMessage(rmxType, sender, payload);
    }

    newBinaryMessage(rmxType, sender, payload) {
        return new BinaryMessage(rmxType, sender, payload);
    }

    newLocalMessage(rmxType, sender, payload) {
        return new LocalMessage(rmxType, sender, payload);
    }

    newEOF(rmxType, sender, payload) {
        return new EOF(rmxType, sender, payload);
    }
}

// This class starts the web worker for the hub. Should only be instantiated
// once.
class Worker {
    constructor() {
        if (globalThis.RmxMessagingHub) {
            this.worker = globalThis.RmxMessagingHub.worker;
            this.expect = globalThis.RmxMessagingHub.expect;
            this.noreconfigure = true;
            return;
        };
        let bundle;
        if (globalThis.ThisIsNode) {
            bundle = new URL("../../hub-worker/src/node.js", ({ url: getAbsoluteUrl('rc/index.js') }).url);
        } else if (globalThis.GROOVEBOX_URL_PREFIX) {
            // FIXME: Stopgap solution until we figure out a way to bundle groovebox correctly
            bundle = new URL(`${globalThis.GROOVEBOX_URL_PREFIX}/hub-worker.js`, window.location.href);
        } else {
            bundle = new URL("/g/hub-worker.js", window.location.href);
        }
        this.worker = new globalThis.Worker(bundle);
        globalThis.RmxMessagingHub = this;
        let thisworker = this;
        this.expect = new Array(0);
        this.worker.onmessage = (ev => {
            let f = thisworker.expect.shift();
            f(ev)
        });
        this.noreconfigure = false;
        terminate(() => thisworker.worker.terminate());
    }

    configure(config_obj) {
        if (this.noreconfigure) {
            console.warn("The global hub-client is already configured");
            return;
        };
        let thisworker = this;
        return new Promise((resolve, reject) => {
            thisworker.expect.push(resp => {
                if (resp.data.error == null)
                    resolve(resp.data);
                else
                    reject(resp.data)
            });
            let config_msg = 
                { "_rmx_type": "msg_hub_configure",
                  "baseURL": config_obj.baseURL,
                  "wsURL": config_obj.wsURL,
                  "user": config_obj.user,
                  "token": config_obj.token,
                  "standalone": config_obj.standalone === true
                };
            thisworker.worker.postMessage(config_msg);
        })
    }

    newChannel() {
        let thisworker = this;
        return new Promise((resolve, reject) => {
            thisworker.expect.push(resp => {
                if (resp.data.error == null) {
                    let port = resp.ports !== undefined ? resp.ports[0] : resp.data.port;
                    let hubch = new Channel(port);
                    resolve(hubch);
                } else
                    reject(resp.data)
            });
            let msg =
                { "_rmx_type": "msg_hub_newChannel" };
            thisworker.worker.postMessage(msg);
        })
    }

    newJSONMessage(rmxType, sender, payload) {
        return new JSONMessage(rmxType, sender, payload);
    }

    newTextMessage(rmxType, sender, payload) {
        return new TextMessage(rmxType, sender, payload);
    }

    newBinaryMessage(rmxType, sender, payload) {
        return new BinaryMessage(rmxType, sender, payload);
    }

    newLocalMessage(rmxType, sender, payload) {
        return new LocalMessage(rmxType, sender, payload);
    }

    newEOF(rmxType, sender, payload) {
        return new EOF(rmxType, sender, payload);
    }
}



;// CONCATENATED MODULE: ./js/state.js
if (state_self === undefined) {
    // nodejs needs this
    var state_self = globalThis
}

// debug flags < 256 are defined on the C side (memory.h)
const DEBUG_MESSAGES = 256;
const DEBUG_QUEUES = 512;
const DEBUG_OUTPUT = 1024;

const debugFlags =
      { DEBUG_MESSAGES,
        DEBUG_QUEUES,
        DEBUG_OUTPUT
      }

class State {
    constructor(config, sboard) {
        this.config = config.isConfig();
        this.sboard = sboard.isSwitchboard();
        this.drvCount = 0;
        this.drvRequest = null;
        this.drvSerial = [-1];
        this.drvEcho = new Array();
        this.ffiOverride = {};
        this.mixCode = new Map();
        this.standalone = false;     // whether there is no amp
        this.postponedError = null;
        this.haveByteCode = false;   // and not wasm code
        this.wasm = null;                 // the ABI object
        this.cached_main_module = undefined;   // the module mixrt.wasm
        this.localFFIs = {}; // maps coroutines to infos about local FFIs

        this.mixrt_code = null;           // the code of mixrt.wasm (bytes)
        if (state_self.mixrt_code !== undefined && state_self.mixrt_code !== null)
            this.mixrt_code = state_self.mixrt_code;
        this.mixextra_code = null;           // the code of rmxextra.wasm (bytes)
        if (state_self.mixextra_code !== undefined && state_self.mixextra_code !== null)
            this.mixextra_code = state_self.mixextra_code;
    }

    isState() {
        return this
    }
}

class Config {
    constructor() {
        this.vmID = "unknown-vmID";
        this.org = "unknown-org";
        this.workspace = "unknown-workspace";
        this.baseURL = "unknown-baseURL";
        this.user = "unknown-user";
        this.token = "unknown-token";
        this.outputViaMQTT = true;
        this.debugMask = DEBUG_OUTPUT;
        this.machType = "WASM";
        this.quickLoad = false;
        // whether to start quickly at the expense of safety and memory
    }

    isConfig() {
        return this
    }

    topicBase() {
        return "/org/" + this.org + "/ws/" + this.workspace + "/vm/" + this.vmID;
    }
}



;// CONCATENATED MODULE: ./js/switchboard.js


class Switchboard {
    // We get incoming messages from three sources: "driver" (i.e. the
    // "requests" topic), "async" (i.e. the "control" topic and async FFIs), and
    // "FFI" (i.e. the "ffireturn" topic). We cannot freely mix the
    // messages from the sources, so there is only one active source,
    // and messages from the other sources are enqueued.
    //
    // The sources are all a bit different:
    // - "driver" is tightly controlled by amp, and we get requests from
    //   amp, and just carry them out. These requests are already properly
    //   serialized, so just exec them one after the other.
    // - "async" means that we get a single request and run the VM until
    //   it gets idle again. The async request can come from multiple
    //   creators, and thus it is possible to see several at once in random
    //   order. We can first start the next one when the previous one is
    //   finished (VM is idle).
    // - "FFI" is a return message after a synchronous FFI call. The VM
    //   is blocked while the FFI is in progress.
    
    constructor(config, chan_driver, chan_async) {
        this.config = config.isConfig();
        this.active = "idle";
        this.queue = new Map();
        this.lock = false;
        this.lock_done = false;
        this.chan_driver = chan_driver;
        this.chan_async = chan_async;
    }

    isSwitchboard() {
        return this
    }

    async driverRequest(f) {
        this.enqueue("driver", f);
        if (!this.lock && (this.active == "idle" || this.active == "driver")) {
            this.switchQueue("driver");
            await this.runQueue(this.chan_driver);
        }
    }

    async asyncRequest(f) {
       this.enqueue("async", f);
       if (!this.lock && this.active == "idle") {
           this.switchQueue("async");
           await this.runNext(this.chan_async);
       }
    }

    FFICall(coid) {
        this.switchQueue("FFI");
        this.FFICoID = coid;
    }
    
    async FFIReturn(coid, f) {
        if (this.active == "FFI" && this.FFICoID == coid) {
            // a synchronous return (including DrvLater)
            if (this.lock) throw new Error("unexpected lock in FFIReturn");
            let qn = this.previous;
            this.switchQueue(qn);
            this.FFICoID = 0;
            switch (qn) {
            case "driver":
                this.enqueueUrgent("driver", f);
                await this.runQueue(this.chan_driver);
                return
            case "async":
                this.enqueueUrgent("async", f);
                await this.runNext(this.chan_async);
                return
            }
        } else {
            // async returns go through "async" queue
            await this.asyncRequest(f);
        }
    }

    async done() {
        // done with the current queue, so look for other work:
        if (this.lock) {
            // we are called from runNext (below), so wait until we get
            // back there and call "done" again
            this.lock_done = true;
            return;
        };
        this.switchQueue("idle");
        let q = this.queue;
        if (q.has("driver") && q.get("driver").length > 0) {
            this.switchQueue("driver");
            await this.runQueue(this.chan_driver);
            return false;
        } else if (q.has("async") && q.get("async").length > 0) {
            this.switchQueue("async");
            await this.runNext(this.chan_async);
            return false
        };
        return true;
    }

    enqueue(which, f) {
        let q = this.queue.get(which);
        if (q === undefined) {
            q = [];
            this.queue.set(which, q);
        };
        q.push(f)
    }

    enqueueUrgent(which, f) {
        let q = this.queue.get(which);
        if (q === undefined) {
            q = [];
            this.queue.set(which, q);
        };
        q.unshift(f)
    }

    switchQueue(which) {
        if (this.active != which) {
            this.previous = this.active;
            this.active = which;
            if (this.config.debugMask & debugFlags.DEBUG_QUEUES)
                console.log("mix machine: switching to queue: " + which)
        }
    }

    async runQueue(chan) {
        let cont = true;
        while (cont) {
            cont = await this.runNext(chan)
        }
    }

    async runNext(chan) {
        let which = this.active;
        let q = this.queue.get(which);
        if (q === undefined || q.length == 0)
            return false
        else {
            let f = q.shift();
            this.lock = true;
            this.lock_done = false;
            try {
                await f(chan);
            } finally {
                this.lock = false;
            };
            if (this.lock_done) {
                this.lock_done = false;
                this.done();
            };
            return true
        }
    }
}



;// CONCATENATED MODULE: ./js/mixrt.js

// control.h, enum mixrt_state:

const STATE_INIT = 0;
const STATE_RUNNING = 1;
const STATE_INIT_DONE = 2;
const STATE_ENTRY = 3;
const STATE_EXIT = 4;
const STATE_IDLE = 5;
const STATE_FFI_CALL = 6;
const STATE_FFI_RETURN = 7;
const STATE_PANIC = 10;
const STATE_TIMEOUT = 11;

const states =
      { STATE_INIT,
        STATE_RUNNING,
        STATE_INIT_DONE,
        STATE_ENTRY,
        STATE_EXIT,
        STATE_IDLE,
        STATE_FFI_CALL,
        STATE_FFI_RETURN,
        STATE_PANIC ,
        STATE_TIMEOUT
      }

const TAG_UNDEFINED = 0
const TAG_BOOL = 1
const TAG_NULL = 2
// 3: reserved
const TAG_NUMBER = 4
// 5: reserved (for another number representation)
const TAG_HANDLE = 6
const TAG_EMPTYMAP = 7  // not used in JS
const TAG_STRING = 8
const TAG_TAGGEDSTRING = 9
const TAG_BINARY = 10
// 11: reserved (for another string/bytes representation)
const TAG_OPAQUE = 12     // uninterpreted data
// 13-15: reserved for types that do not contain any addresses. The GC
// doesn't scan these values.
const TAG_ARRAY = 16
const TAG_MAP = 17
const TAG_MUTABLE = 18   // mutable reference
// 19: backref (not used here)
const TAG_CLOSURE = 21
const TAG_STREAM = 22   // closure-backed stream
const TAG_PROXY = 24    // proxy of a native object or function
const TAG_IOMAP = 25    // linear map (I/O block only)
const TAG_CASE = 26
const TAG_STREAMREDIR = 27   // redirected stream
const TAG_TOKEN = 28

const tags =
      { TAG_UNDEFINED,
        TAG_BOOL,
        TAG_NULL,
        TAG_NUMBER,
        TAG_HANDLE,
        TAG_EMPTYMAP,
        TAG_STRING,
        TAG_TAGGEDSTRING,
        TAG_BINARY,
        TAG_OPAQUE,
        TAG_ARRAY,
        TAG_MAP,
        TAG_MUTABLE,
        TAG_CLOSURE,
        TAG_STREAM,
        TAG_PROXY,
        TAG_IOMAP,
        TAG_CASE,
        TAG_STREAMREDIR,
        TAG_TOKEN
      }

const ERR_USER = 3;
const ERR_SEE_PROXY = 40;

const errs =
      { ERR_USER,
        ERR_SEE_PROXY
      }

function copyOutMixValue(wasm, ptr) {
    let mixrt = wasm.instance.exports;
    let n_bytes = wasm.call(mixrt.mixrt_copyYGtoIO, ptr);
    let n_words = n_bytes / 4;
    if (n_bytes == 0) {
        return undefined;
    };
    let io = wasm.call(mixrt.mixrt_getIO);
    wasm.call(mixrt.mixrt_relocateOutput, io, n_words);
    let buf = new Uint8Array(n_bytes);
    buf.set(wasm.mem8.subarray(io, io+n_bytes));
    return buf;
}

function copyInMixValue(wasm, buf) {
    let mixrt = wasm.instance.exports;
    let n_bytes = buf.length;
    let n_words = (n_bytes-1)/4+1;
    wasm.call(mixrt.mixrt_growIO, n_words);
    let io = wasm.call(mixrt.mixrt_getIO);
    wasm.mem8.subarray(io, io+n_bytes).set(buf);
    let ok = wasm.call(mixrt.mixrt_relocateInput, io, n_words);
    if (!ok) {
        let code = mixrt_getError();
        throw new Error("copyInMixValue: cannot relocate value - code " + code)
    };
    return io;
}

function allocCopyInCString(wasm, s) {
    let mixrt = wasm.instance.exports;
    let buf = new TextEncoder().encode(s);
    let n = buf.length;
    let ptr = wasm.call(mixrt.malloc, n + 1);
    if (ptr == 0) {
        throw new Error("out of memory");
    }
    wasm.mem8.subarray(ptr, ptr+n).set(buf);
    wasm.mem8[ptr+n] = 0;
    return ptr;
}

function free(wasm, ptr) {
    let mixrt = wasm.instance.exports;
    wasm.call(mixrt.free, ptr);
}

function copyOutCString(wasm, ptr, maxlen) {
    let n = 0;
    while (wasm.mem8[ptr+n] != 0 && n < maxlen) n++;
    let buf = new Uint8Array(n);
    buf.set(wasm.mem8.subarray(ptr, ptr+n));
    return new TextDecoder().decode(buf);
}

function copyOutBinary(wasm, ptr, length) {
    let buf = new Uint8Array(length);
    buf.set(wasm.mem8.subarray(ptr, ptr+length));
    return buf;
}

function copyOutOpaque(wasm, ptr, length) {
    let buf = new Uint32Array(length);
    buf.set(wasm.mem32.subarray(ptr >> 2, (ptr >> 2)+length));
    return buf;
}

const requestQueues =  // see enum mixrt_reqqueue
      [ "unset", "driver", "async", "FFI", "internal" ]


function getRequestQueue(wasm) {
    let mixrt = wasm.instance.exports;
    let code = wasm.call(mixrt.mixrt_getReqQueue);
    return requestQueues[code];
}

function mapRequestQueue(wasm, name) {
    return requestQueues.findIndex(n => n == name);
}

function setRequestQueue(wasm, name) {
    let code = requestQueues.findIndex(n => n == name);
    let mixrt = wasm.instance.exports;
    wasm.call(mixrt.mixrt_setReqQueue, code);
}

class Token {
    constructor(data, enabled, extras) {
        // data: must be an Uint8Array
        // enabled: a number with the bitset of enabled operations
        // extras: a map
        if (!data instanceof Uint8Array)
            throw new Error("Token: data must be an Uint8Array");
        if (typeof(enabled) != "number")
            throw new Error("Token: enabled_ops must be a number");
        this.data = data;
        this.enabled = enabled;
        this.extras = extras;
    }
}

function protectedAuthToken(data) {
    if (typeof(data) != "string")
        throw new Error("token must be a string");
    let bin = new TextEncoder().encode(data);
    let op_auth_same_org = 0;
    let op_tostring = 8;
    return new Token(bin, (1 << op_auth_same_org) | (1 << op_tostring), {});
}

class Case {
    constructor(name, arg) {
        if (typeof(name) != "string")
            throw new Error("Case: name must be a string");
        this.name = name;
        this.arg = arg;
    }
}

class Opaque {
    constructor(buf) {
        if (!(buf instanceof Uint32Array))
            throw new Error("Opaque: must be a Uint32Array");
        this.data = buf;
    }
}

function b64encode(buf) {
    let s = "";
    for (let i = 0; i < buf.byteLength; i++) {
        s += String.fromCharCode(buf[i]);
    };
    return btoa(s);
}

function b64decode(str) {
    let s = atob(str);
    let buf = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
        buf[i] = s.charCodeAt(i);
    }
    return buf;
}

function extractTagFromString(value) {
    if (typeof(value) !== "string") return null;
    if (!value.startsWith("{")) return null;
    let i = value.indexOf("}");
    if (i < 0) return null;
    let tag = value.substring(1, i);
    let j = tag.indexOf(":");
    if (j >= 0) tag = tag.substring(0, j);
    return tag;
}

function extractTagFromObject(value) {
    let ty = value["_rmx_type"]
    if (ty === undefined || typeof(ty) !== "string") return null;
    if (!ty.startsWith("{tag}")) return null;
    ty = ty.substring(5);
    if (ty == "case:db.ref") return "ref";
    let i = ty.indexOf(":");
    if (i >= 0) ty = ty.substring(0, i);
    return ty;
}

function extractAnnotationFromString(value) {
    if (typeof(value) !== "string") return "";
    if (!value.startsWith("{")) return "";
    let i = value.indexOf("}");
    if (i < 0) return "";
    let tag = value.substring(1, i);
    let j = tag.indexOf(":");
    if (j >= 0) return tag.substring(j+1);
    return "";
}

function extractAnnotationFromObject(value) {
    let ty = value["_rmx_type"]
    if (ty === undefined || typeof(ty) !== "string") return null;
    if (!ty.startsWith("{tag}")) return null;
    ty = ty.substring(5);
    let i = ty.indexOf(":");
    if (i >= 0) ty = ty.substring(i+1); else ty = "";
    return ty;
}

function extractValueFromString(value) {
    if (typeof(value) !== "string") return "";
    if (!value.startsWith("{")) return "";
    let i = value.indexOf("}");
    if (i < 0) return "";
    return value.substring(i+1);
}

function newJSONEncoder() {
    return {
        encode_undefined: (() => { return {_rmx_type: "{tag}undefined"}}),
        encode_bool: (b => b),
        encode_null: (() => null),
        encode_number: (x => {
            if (Number.isFinite(x)) return x;
            if (Number.isNaN(x)) return {_rmx_type: "{tag}nan"};
            if (x === Number.POSITIVE_INFINITY) return {_rmx_type: "{tag}posinf"};
            if (x === Number.NEGATIVE_INFINITY) return {_rmx_type: "{tag}neginf"};
            throw new Error("cannot categorize number: " + x);
        }),
        encode_string: (s => s),
        encode_taggedString: (s => {
            let tag = extractTagFromString(s);
            if (tag == null) return s;
            let ann = extractAnnotationFromString(s);
            if (ann != "") ann = ":" + ann;
            let val = extractValueFromString(s);
            if (tag == "ref") {
                return {_rmx_type: "{tag}case:db.ref", _rmx_value: val};
            }
            return {_rmx_type: "{tag}" + tag + ann, _rmx_value: val};
        }),
        encode_binary: (buf => {
            return {_rmx_type: "{tag}bin", _rmx_value: b64encode(buf) }
        }),
        encode_opaque: (buf => "<opaque>"),
        encode_mapCreate: (() => ({})),
        encode_mapSet: ((m,k,v) => {
            if (k == "_rmx_type" && extractTagFromString(v) != null)
                m[k] = "{str}" + v;
            else
                m[k] = v
        }),
        encode_arrayCreate: (() => []),
        encode_arrayPush: ((a, x) => a.push(x)),
        encode_case0: (n => { return { "_rmx_type": "{tag}case:" + n }}),
        encode_case1: ((n,v) => { return { "_rmx_type": "{tag}case:" + n, "_rmx_value": v }}),
        encode_token: ((data,enabled) => "<opaque token>")
    }
}

function newValueEncoder() {
    return {
        encode_undefined: (() => undefined),
        encode_bool: (b => b),
        encode_null: (() => null),
        encode_number: (x => x),
        encode_string: (s => s),
        encode_taggedString: (s => s),
        encode_binary: (buf => buf),
        encode_opaque: (buf => { return new Opaque(buf) }),
        encode_mapCreate: (() => ({})),
        encode_mapSet: ((m,k,v) => m[k] = v),
        encode_arrayCreate: (() => []),
        encode_arrayPush: ((a, x) => a.push(x)),
        encode_case0: (n => { return new Case(n, undefined) }),
        encode_case1: ((n,v) => { return new Case(n, v) }),
        encode_token: ((data,enabled,extras) => { return new Token(data, enabled, extras) })
    }
}

function newClonableEncoder() {
    // Use a special representation that survives the "structured clone"
    // algorithm of JS.
    return {
        encode_undefined: (() => undefined),
        encode_bool: (b => b),
        encode_null: (() => null),
        encode_number: (x => x),
        encode_string: (s => s),
        encode_taggedString: (s => s),
        encode_binary: (buf => buf),
        encode_opaque: (buf => {
            let m = new Map([
                [ "_rmx_type", "opaque" ],
                [ "data", buf ]
            ]);
            return m;
        }),
        encode_mapCreate: (() => ({})),
        encode_mapSet: ((m,k,v) => m[k] = v),
        encode_arrayCreate: (() => []),
        encode_arrayPush: ((a, x) => a.push(x)),
        encode_case0: (n => {
            let m = new Map([
                [ "_rmx_type", "case" ],
                [ "name", n ],
                [ "arg", undefined ]
            ]);
            return m;
        }),
        encode_case1: ((n,v) => {
            let m = new Map([
                [ "_rmx_type", "case" ],
                [ "name", n ],
                [ "arg", v ]
            ]);
            return m;
        }),
        encode_token: ((data,enabled,extras) => {
            let m = new Map([
                [ "_rmx_type", "token" ],
                [ "data", data ],
                [ "enabled", enabled ],
                [ "extras", extras ]
            ]);
            return m;
        })
    }
}

// buf is an array of 32-bit integers
function exportRmxCodec(buf, ptr, encoder) {
    function get(i) {
        return buf[ptr + i];
    }
    function size() {
        return get(0);
    }
    function slice(i, len) {
        return buf.subarray(ptr + i, ptr + i + len);
    }
    function exportAtPtr(i) {
        return exportRmxCodec(buf, get(i)/4, encoder);
    }
    function floatFromU32s(u32s) {
        let buf = new DataView(u32s.buffer, u32s.byteOffset, u32s.byteLength);
        return buf.getFloat64(0, true);
    }
    function binary() {
        let len = size() - 1;
        let u32s = slice(3, len);
        let bytes0 = new Uint8Array(u32s.buffer, u32s.byteOffset, u32s.byteLength);
        let pad = bytes0[bytes0.length - 1];
        return bytes0.subarray(0, bytes0.length - pad - 1);
    }
    function string() {
        let bytes = binary();
        return new TextDecoder().decode(bytes);
    }
    
    let tag = get(1) & 0xff;
    switch (tag) {
    case TAG_UNDEFINED:
        return encoder.encode_undefined()
    case TAG_BOOL:
        return encoder.encode_bool(get(2) != 0);
    case TAG_NULL:
        return encoder.encode_null();
    case TAG_NUMBER:
        { let f = floatFromU32s(slice(2, 2));
          return encoder.encode_number(f);
        }
    case TAG_EMPTYMAP:
        return encoder.encode_mapCreate();
    case TAG_STRING:
        return encoder.encode_string(string());
    case TAG_TAGGEDSTRING:
        return encoder.encode_taggedString(string());
    case TAG_BINARY:
        return encoder.encode_binary(binary());
    case TAG_OPAQUE:
        { let len = size();
          let buf = new Uint32Array(len);
          buf.set(slice(2, len));
          return encoder.encode_opaque(buf);
        }
    case TAG_ARRAY:
        { let len = get(3);
          let a = encoder.encode_arrayCreate();
          for (let k = 0; k < len; k++) {
              let e = exportAtPtr(4 + k);
              encoder.encode_arrayPush(a, e);
          };
          return a;
        }
    case TAG_IOMAP:
        { let len = size() / 2;
          let m = encoder.encode_mapCreate();
          for (let k = 0; k < len; k++) {
              let key = exportAtPtr(2+k);
              let val = exportAtPtr(2+k+1);
              encoder.encode_mapSet(m, key, val);
          }
          return m;
        }
    case TAG_MAP:
        {
            let m = encoder.encode_mapCreate();
            let todo = [ptr];
            while (todo.length > 0) {
                let ptr = todo.shift();
                let tag = buf[ptr + 1] & 0xff;
                if (tag == TAG_MAP) {
                    let key = exportRmxCodec(buf, buf[ptr + 3], encoder);
                    let val = exportRmxCodec(buf, buf[ptr + 4], encoder);
                    encoder.encode_mapSet(m, key, val);
                    todo.push(buf[ptr + 5]);
                    todo.push(buf[ptr + 6]);
                }
            }
            return m;
        }
    case TAG_CASE:
        { let case_name = exportAtPtr(2);
          let case_val = exportAtPtr(3);
          if (case_val === undefined) {
              return encoder.encode_case0(case_name);
          } else {
              return encoder.encode_case1(case_name, case_val);
          }
        }
    case TAG_TOKEN:
        { let ops = get(2);
          let data = exportAtPtr(3);
          let extras = exportAtPtr(4);
          return encoder.encode_token(ops, data, extras);
        }
    default:
        return "{unprintable: " + tag + "}";
    }
}

function exportMixValue(wasm, ptr, encoder) {
    let mixrt = wasm.instance.exports;
    switch (wasm.call(mixrt.mixrt_getTag, ptr)) {
    case TAG_UNDEFINED:
        return encoder.encode_undefined()
    case TAG_BOOL:
        return encoder.encode_bool(wasm.call(mixrt.mixrt_getBool, ptr) != 0);
    case TAG_NULL:
        return encoder.encode_null();
    case TAG_NUMBER:
        return encoder.encode_number(wasm.call(mixrt.mixrt_getNumber, ptr));
    case TAG_EMPTYMAP:
        return encoder.encode_mapCreate();
    case TAG_STRING:
        { let buf = wasm.call(mixrt.mixrt_getString, ptr);
          let s = copyOutCString(wasm, buf, 10_000_000);
          return encoder.encode_string(s);
        }
    case TAG_TAGGEDSTRING:
        { let buf = wasm.call(mixrt.mixrt_getString, ptr);
          let s = copyOutCString(wasm, buf, 10_000_000);
          return encoder.encode_taggedString(s);
        }
    case TAG_BINARY:
        { let buf = wasm.call(mixrt.mixrt_getBinary, ptr);
          let len = wasm.call(mixrt.mixrt_getBinaryLength, ptr);
          let s = copyOutBinary(wasm, buf, len);
          return encoder.encode_binary(s);
        }
    case TAG_OPAQUE:
        { let len = wasm.mem32[ptr >> 2];
          let opaq = copyOutOpaque(wasm, ptr+8, len);
          return encoder.encode_opaque(opaq);
        }
    case TAG_ARRAY:
        { let n = wasm.call(mixrt.mixrt_arrayLength, ptr);
          let a = encoder.encode_arrayCreate();
          for (let k = 0; k < n; k++) {
              let x = wasm.call(mixrt.mixrt_arrayGet, ptr, k, false);
              let e = exportMixValue(wasm, x, encoder);
              encoder.encode_arrayPush(a, e);
          };
          return a;
        }
    case TAG_MAP:
        { let buf_size = wasm.call(mixrt.mixrt_mapHeightLimit);
          let buf = wasm.call(mixrt.malloc, 4 * buf_size);
          if (buf == 0) throw new Error("out of memory");
          let m = encoder.encode_mapCreate();
          let iter = wasm.call(mixrt.mixrt_mapIterateStatic, buf, buf_size, ptr);
          while (iter != 0) {
              let key_mix = wasm.call(mixrt.mixrt_mapCurrentKey, iter);
              let key = exportMixValue(wasm, key_mix, encoder);
              let val_mix = wasm.call(mixrt.mixrt_mapCurrentValue, iter);
              let val = exportMixValue(wasm, val_mix, encoder);
              encoder.encode_mapSet(m, key, val);
              iter = wasm.call(mixrt.mixrt_mapNextStatic, buf);
          };
          wasm.call(mixrt.free, buf);
          return m;
        }
    case TAG_CASE:
        { let case_name = exportMixValue(wasm, wasm.call(mixrt.mixrt_caseName, ptr), encoder);
          let case_has_arg = wasm.call(mixrt.mixrt_caseHasArg, ptr);
          let case_val;
          if (case_has_arg) {
              case_val = exportMixValue(wasm, wasm.call(mixrt.mixrt_caseGetArg, ptr), encoder);
              return encoder.encode_case1(case_name, case_val);
          } else {
              return encoder.encode_case0(case_name);
          }
        }
    case TAG_TOKEN:
        { let data_ptr = wasm.call(mixrt.mixrt_tokenData, ptr);
          let data_buf_ptr = wasm.call(mixrt.mixrt_getBinary, data_ptr);
          let data_len = wasm.call(mixrt.mixrt_getBinaryLength, data_ptr);
          let data = copyOutBinary(wasm, data_buf_ptr, data_len);
          let enabled = wasm.call(mixrt.mixrt_tokenEnabledOps, ptr);
          let extras_ptr = wasm.call(mixrt.mixrt_tokenExtras, ptr);
          let extras = copyOutMixValue(wasm, extras_ptr);
          return encoder.encode_token(data, enabled, extras);
        }
    default:
        return "{unprintable}";
    }
}

function isCaseObj(value) {
    let ty = value["_rmx_type"]
    if (ty === undefined || typeof(ty) !== "string") return false;
    if (!ty.startsWith("{tag}case:")) return false;
    if (ty == "{tag}case:db.ref") return false;
    return true;
}

class ValueOnly {
    constructor(data) {
        this.data = data
    }
}

let supported_tags =
    { "tag_undefined": true,
      "tag_null": true,
      "tag_str": true,
      "tag_bin": true,
      "tag_nan": true,
      "tag_posinf": true,
      "tag_neginf": true,
      "tag_handle": true,
      "tag_tag": true,
      "tag_ref": true,
    }

function newJSONDecoder() {
    return {
        decode_type: (x => {
            switch (typeof(x)) {
            case "undefined":
                return "undefined";
            case "boolean":
                return "boolean";
            case "number":
                return "number";
            case "string":
                return "string";
            case "object":
                if (Array.isArray(x)) return "array";
                if (x === null) return "null";
                if (x instanceof Case || isCaseObj(x)) return "case";
                if (x instanceof Token) return "token";
                if (x instanceof Uint8Array) return "binary";
                if (x instanceof ValueOnly) return "valueOnly";
                let maybeTag = extractTagFromObject(x);
                if (typeof(maybeTag) == "string") {
                    let tag = "tag_" + maybeTag;
                    if (supported_tags[tag])
                        return tag;
                }
                return "map";
            default:
                throw new Error("Cannot import this type of value: " + typeof(x))
            }
        }),
        decode_value: ((ty, x) => {
            if (ty.startsWith("tag_")) {
                return x._rmx_value !== undefined ? x._rmx_value : x.data;
            };
            switch (ty) {
            case "case":
                if (!(x instanceof Case)) {
                    let name = x["_rmx_type"].substring(10);
                    let arg = x["_rmx_value"];
                    return new Case(name, arg);
                }
                return x;
            case "map":
                let rty = x["_rmx_type"];
                if (rty !== undefined && rty.startsWith("{str}")) {
                    rty = rty.substring(5);
                    let copy = {};
                    Object.assign(copy, x);
                    copy["_rmx_type"] = rty;
                    return copy;
                };
                return x;
            default:
                return x;
            }
        })
    }
}

function newValueDecoder() {
    return {
        decode_type: (x => {
            switch (typeof(x)) {
            case "undefined":
                return "undefined";
            case "boolean":
                return "boolean";
            case "number":
                return "number";
            case "string":
                return "string";
            case "object":
                if (Array.isArray(x)) return "array";
                if (x === null) return "null";
                if (x instanceof Case) return "case";
                if (x instanceof Token) return "token";
                if (x instanceof Opaque) return "opaque";
                if (x instanceof Uint8Array) return "binary";
                if (x instanceof ValueOnly) return "valueOnly";
                return "map";
            default:
                throw new Error("Cannot import this type of value: " + typeof(x))
            }
        }),
        decode_value: ((ty, x) => x)
    }
}

function newClonableDecoder() {
    return {
        decode_type: (x => {
            switch (typeof(x)) {
            case "undefined":
                return "undefined";
            case "boolean":
                return "boolean";
            case "number":
                return "number";
            case "string":
                return "string";
            case "object":
                if (Array.isArray(x)) return "array";
                if (x === null) return "null";
                if (x instanceof Map) {
                    return x.get("_rmx_type");
                }
                if (x instanceof Uint8Array) return "binary";
                return "map";
            default:
                throw new Error("Cannot import this type of value: " + typeof(x))
            }
        }),
        decode_value: ((ty, x) => {
            switch (ty) {
            case "case":
                return { name: x.get("name"), arg: x.get("arg") }
            case "token":
                return { data: x.get("data"),
                         enabled: x.get("enabled"),
                         extras: x.get("extras")
                       }
            case "opaque":
                return { data: x.get("data") }
            default:
                return x;
            }
        })
    }
}

function importMixValue(wasm, data, decoder) {
    let mixrt = wasm.instance.exports;
    let buf = new Array();
    importRmxCodec(buf, data, decoder);
    let io = copyInMixValue(wasm, buf);
    let val_ptr = wasm.call(mixrt.mixrt_copyIOtoYG, io, io, io+buf.length);
    return val_ptr;
}

function importRmxCodec(buf, data, decoder) {
    // writes the JSON value "data" to buf, encoded with the RmxCodec.
    // Note that strings are missing the CRC code.

    function pushInt(buf, k) {
        buf.push(k & 0xff, (k >> 8) & 0xff, (k >> 16) & 0xff, (k >> 24) & 0xff)
    }
    function pushNull(buf) {
        buf.push(0, 0, 0, 0,
                 2, 0, 0, 0);
    }
    function pushUndefined(buf) {
        buf.push(1, 0, 0, 0,
                 0, 0, 0, 0,
                 1, 0, 0, 0,
                 0xff, 0xff, 0xff, 0xff);
    }
    function pushNumber(buf, x) {
        buf.push(2, 0, 0, 0,
                 4, 0, 0, 0);
        let numbuf = new DataView(new ArrayBuffer(8));
        numbuf.setFloat64(0, x, true);
        buf.push(numbuf.getUint8(0));
        buf.push(numbuf.getUint8(1));
        buf.push(numbuf.getUint8(2));
        buf.push(numbuf.getUint8(3));
        buf.push(numbuf.getUint8(4));
        buf.push(numbuf.getUint8(5));
        buf.push(numbuf.getUint8(6));
        buf.push(numbuf.getUint8(7));
    }
    function pushBinary(buf, tag, bytes) {
        let hdr_len = Math.floor(bytes.length / 4) + 2;
        let padding = 4 - (bytes.length % 4);
        pushInt(buf, hdr_len);
        pushInt(buf, tag);
        pushInt(buf, 0);  // this is the CRC - skipping this
        for (let ch of bytes) buf.push(ch);
        for (let k = 0; k < padding-1; k++) buf.push(0);
        buf.push(padding - 1);
        if (hdr_len % 2 == 1) pushInt(buf, 0xffffffff);
    }
    function pushString(buf, tag, s) {
        let bytes = new TextEncoder().encode(s);
        pushBinary(buf, tag, bytes);
    }
    function setPtr(buf, p) {
        let buf2 = new Array();
        pushInt(buf2, buf.length);
        buf[p] = buf2[0];
        buf[p + 1] = buf2[1];
        buf[p + 2] = buf2[2];
        buf[p + 3] = buf2[3];
    }

    let ty = decoder.decode_type(data);
    let payload = decoder.decode_value(ty, data);

    switch (ty) {
    case "undefined":
    case "tag_undefined":
        pushUndefined(buf);
        break;
    case "null":
    case "tag_null":
        pushNull(buf);
        break;
    case "boolean":
        pushInt(buf, 1);
        pushInt(buf, 1);
        pushInt(buf, payload ? 2 : 0);
        pushInt(buf, 0xffffffff);
        break;
    case "number":
        pushNumber(buf, payload);
        break;
    case "tag_str":
        pushString(buf, 8, payload);
        break;
    case "tag_bin":
        pushBinary(buf, 10, b64decode(payload));
        break;
    case "tag_nan":
        pushNumber(buf, Number.NaN);
        break;
    case "tag_posinf":
        pushNumber(buf, Number.POSITIVE_INFINITY);
        break;
    case "tag_neginf":
        pushNumber(buf, Number.NEGATIVE_INFINITY);
        break;
    case "tag_handle":
        let id = parseInt(payload);
        pushInt(buf, 1);
        pushInt(buf, 6);
        pushInt(buf, id);
        pushInt(buf, 0xffffffff);
        break;
    case "tag_ref":
        //let ann = extractAnnotationFromObject(data);
        //if (ann != "") ann = ":" + ann;
        let ann = "";
        let ref = "{ref" + ann + "}";
        pushString(buf, 9, ref + payload);
        break;
    case "string":
        pushString(buf, 8, payload);
        break;
    case "binary":
        pushBinary(buf, 10, payload);
        break;
    case "opaque":
        pushInt(buf, payload.data.length);
        pushInt(buf, 12);
        for (let k = 0; k < payload.data.length; k++) {
            pushInt(buf, payload.data[k]);
        };
        if (payload.data.length % 2 == 1)
            pushInt(buf, 0xffffffff);
        break;
    case "array":
        { pushInt(buf, payload.length + 2);
          pushInt(buf, 0x210);
          pushInt(buf, 0);
          pushInt(buf, payload.length);
          let p = buf.length;
          for (let k = 0; k < payload.length; k++) pushInt(buf, 0);
          if (payload.length % 2 === 1) pushInt(buf, 0xffffffff);
          for (let k = 0; k < payload.length; k++) {
              setPtr(buf, p+4*k);
              importRmxCodec(buf, payload[k], decoder);
          };
          break;
        }
    case "case":
        { pushInt(buf, 2);
          pushInt(buf, 26);
          let p2 = buf.length;
          pushInt(buf, 0);
          pushInt(buf, 0);
          setPtr(buf, p2);
          importRmxCodec(buf, payload.name, decoder);
          setPtr(buf, p2+4);
          importRmxCodec(buf, payload.arg, decoder);
          break;
        }
    case "map":
        {   // write as IOMAP
            let iter = Symbol.iterator in payload ? payload : Object.entries(payload);
            let n = 0;
            for (const pair of iter) n++;
            iter = Symbol.iterator in payload ? payload : Object.entries(payload);
            pushInt(buf, 2*n);
            pushInt(buf, 0x19);
            let q = buf.length;
            for (let k = 0; k < 2*n; k++) pushInt(buf, 0);
            for (const pair of iter) {
                setPtr(buf, q);
                q += 4;
                importRmxCodec(buf, pair[0], decoder);
                setPtr(buf, q);
                q += 4;
                importRmxCodec(buf, pair[1], decoder);
            }
            break;
        }
    case "token":
        { let d = payload.data;
          let en = payload.enabled;
          let ex = payload.extras || {};
          pushInt(buf, 3);
          pushInt(buf, 0x100 | 28);
          pushInt(buf, en);
          let p2 = buf.length;
          pushInt(buf, 0);
          let p3 = buf.length;
          pushInt(buf, 0);
          pushInt(buf, 0xffffffff);
          setPtr(buf, p2);
          importRmxCodec(buf, d, decoder);
          setPtr(buf, p3);
          importRmxCodec(buf, ex, decoder);
          break;
        }
    case "valueOnly":
        importRmxCodec(buf, data.data, newValueDecoder());
        break;
    default:
        throw new Error("cannot import this type: " + ty)
    }
}



;// CONCATENATED MODULE: ./js/ffi_helpers.js
function isArrayOfStrings(v) {
    if (!Array.isArray(v)) return false;
    for (let k = 0; k < v.length; v++) {
        if (typeof(v[k]) != "string") return false;
    };
    return true;
}

function isObjectOfStrings(v) {
    if (typeof(v) !== "object") return false;
    for (let key in v) {
        let val = v[key];
        if (typeof(val) != "string") return false;
    };
    return true;
}

function configGetURL(config, protocols, funcname) {
    let url = config["url"];
    if (url === undefined)
        throw new Error(funcname + ": config key 'url' must be specified");
    if (typeof(url) != "string")
        throw new Error(funcname + ": config key 'url' must be a string");
    let urlObj;
    try {
        urlObj = new URL(url);   // NB. disallows relative URLs
    } catch (e) {
        throw new Error(e.message)
    };
    if (!protocols.includes(urlObj.protocol))
        throw new Error(funcname + ": restricted to https/wss URLs, but got " + urlObj.protocol);
    urlObj.hash = "";
    let urlParams = config["params"];
    if (urlParams !== undefined) {
        if (!isObjectOfStrings(urlParams))
            throw new Error(funcname + ": config key 'params' must be an object of strings");
        if (Objects.keys(urlParams).length > 0) {
            urlObj.searchParams = new URLSearchParams(urlParams);
        }
    };
    return urlObj;
}



;// CONCATENATED MODULE: ./js/ffi_standalone.js
// FFIs that are only activated in standalone mode.
// If not standalone, the FFIs are called that are implemented in amp.




let next_resource = 1;
let resource_table = new Map;

class Resource {
    constructor(kind, tags, destroy) {
        let id = next_resource++;
        this.id = id;
        this.kind = kind;
        this.tags = tags;
        this.destroy = destroy;
        resource_table.set(id, this);
    }
}

function ffi_flush(connector, args) {
    return null;
}

function ffi_loadHook(connector, args) {
    return null;
}

function ffi_destroyHook(connector, args) {
    let tag = args[0];
    resource_table.forEach(res => {
        if (res.tags.includes(tag)) {
            res.destroy(res);
            resource_table.delete(res.id);
        }
    });
    return null;
}

function ffi_freeResources(connector, args) {
    return ffi_destroyHook(connector, args);
}

function ffi_decodeError(connector, args) {
    return args[0];
}

function ffi_get_backtrace(connector, args) {
    // unavailable so far we don't have decodeError
    return [];
}

function websocketDestroy(res) {
    if (res instanceof Resource && res.kind == "websocket") {
        res.websocket.close()
    }
}

function websocketReceiveData(res) {
    if (res.incoming.length > 0 && res.reader != null) {
        let first = res.incoming.shift();
        res.reader(first)
    }
}

function websocketLookup(arg) {
    if (!(arg instanceof Opaque))
        throw new Error("websocket: bad handle");
    let id = arg.data[0];
    let res = resource_table.get(id);
    if (res === undefined || res.kind != "websocket")
        throw new Error("websocket: bad handle");
    return res;
}

function ffi_websocketCreate(connector, args) {
    let config = args[0];
    let tags = config["resourceTags"];
    if (!isArrayOfStrings(tags))
        throw new Error("websocket.create: config key 'resourceTags' must be an array of strings");
    let res = new Resource("websocket", tags, websocketDestroy);
    let urlObj = configGetURL(config, ["wss:"], "websocket.create");
    let protocols = config["subprotocols"];
    if (protocols === undefined)
        protocols = [];
    if (!isArrayOfStrings(protocols))
        throw new Error("websocket.create: config key 'subprotocols' must be an array of strings");
    let timeout = config.timeout;
    if (timeout === undefined)
        timeout = 300;
    if (typeof(timeout) != "number")
        throw new Error("websocket.create: config key 'timeout' must be a number");
    let rd_timeout = config.readTimeout;
    if (rd_timeout === undefined)
        rd_timeout = 0;
    if (typeof(rd_timeout) != "number")
        throw new Error("websocket.create: config key 'readTimeout' must be a number");
    res.websocket = new WebSocket(urlObj, protocols);
    res.websocket.binaryType = "arraybuffer";
    res.incoming = [];
    res.reader = null;
    res.error = undefined;
    res.rd_timeout = rd_timeout;
    res.websocket.onmessage = (ev => {
        res.incoming.push(["message",ev]);
        websocketReceiveData(res);
    });
    res.websocket.onerror = (ev => {
        res.incoming.push(["error",ev]);
        res.error = ev.message;
        websocketReceiveData(res);
    });
    res.websocket.onclose = (ev => {
        res.incoming.push(["close",ev]);
        websocketReceiveData(res);
    });
    return new Promise((resolve, reject) => {
        res.websocket.onopen = (ev => {
            resolve(null)
        });
        if (timeout > 0)
            setTimeout(() => { reject(new Error("websocket timeout")) },
                       timeout * 1000)
    }).then(dummy => {
        let opaqbuf = new Uint32Array(1);
        opaqbuf[0] = res.id;
        return new Opaque(opaqbuf);
    })
}

function ffi_websocketError(connector, args) {
    try {
        let res = websocketLookup(args[0]);
        return res.error;
    } catch (e) {
        return e.message;
    }
}

function ffi_websocketWrite(connector, args) {
    let res = websocketLookup(args[0]);
    let item = args[1];
    if (!(item instanceof Case))
        throw new Error("websocket.write: bad message");
    switch (item.name) {
    case "websocket.textMsg":
        res.websocket.send(item.arg);
        break;
    case "websocket.binMsg":
        res.websocket.send(item.arg);
        break;
    case "websocket.pingMsg":
        break;
    case "websocket.pongMsg":
        break;
    case "websocket.closeMsg":
        res.websocket.close(item.arg.code, item.arg.text);
        break;
    default:
        throw new Error("websocket.write: bad message");
    };
    return null;
}

function ffi_websocketRead(connector, args) {
    let res = websocketLookup(args[0]);
    if (res.reader != null)
        throw new Error("websocket.read: there is already a reader");
    return new Promise((resolve, reject) => {
        res.reader = resolve;
        websocketReceiveData(res);
        if (res.incoming.length == 0) {
            if (res.closeEv)
                resolve(["close", res.closeEv]);
            else if (res.error)
                reject(new Error(res.error))
            else if (res.rd_timeout > 0)
                setTimeout(() => { resolve(["timeout",null]) },
                           res.rd_timeout * 1000);
        }
    }).then(ty_ev => {
        let [ty,ev] = ty_ev;
        res.reader = null;
        switch (ty) {
        case "message":
            if (typeof(ev.data) == "string") {
                return new Case("websocket.textMsg", ev.data);
            } else {
                return new Case("websocket.binMsg", new Uint8Array(ev.data));
            }
        case "error":
            throw new Error(ev.message);
        case "close":
            let arg = { "code": ev.code, "text": ev.reason };
            res.closeEv = ev;
            return new Case("websocket.closeMsg", arg)
        case "timeout":
            throw new Error("websocket timeout")
        }
    })
}

function ffi_websocketClose(connector, args) {
    try {
        let res = websocketLookup(args[0]);
        res.error = "closed";
        res.destroy(res);
        resource_table.delete(res.id);
        return null;
    } catch {
        // be forgiving, and ignore errors here!
    };
    return null;
}

function update_ffis_if_standalone(m) {
    m.set("$flush", ffi_flush);
    m.set("$loadHook", ffi_loadHook);
    m.set("$destroyHook", ffi_destroyHook);
    m.set("$freeResources", ffi_freeResources);
    m.set("$decodeError", ffi_decodeError);
    m.set("get_backtrace", ffi_get_backtrace);
    m.set("$websocket_create", ffi_websocketCreate);
    m.set("$websocket_write", ffi_websocketWrite);
    m.set("$websocket_read", ffi_websocketRead);
    m.set("$websocket_close", ffi_websocketClose);
    m.set("$websocket_error", ffi_websocketError);
}



;// CONCATENATED MODULE: ./js/builtin.js
// Builtins are way lower-level than FFIs. These functions are directly
// called from wasm without any wrapping, and so you can only pass
// over pointers and numbers.

// For wasm, see emscripten_abi.js. The object provides:
// { memory, mem8, mem32, table, instance }



function perfnow() {
    return globalThis.performance ? performance.now() : Date.now();
}

function builtins(wasm) {
    return {
        "perfnow": perfnow
    }
}



;// CONCATENATED MODULE: ./js/abi.js


class ABI {
    constructor(main, state) {
        let abi = this;
        this.main = main;
        // The code to compile - either a Uint8Array, or a
        // Response object (from a previous fetch), or a
        // promise resolving to a Response. You can also pass
        // an (already compiled) wasm module.
        this.state = state.isState();
        this.imp_env = {
        };
        this.imp_wasi_snapshot_preview1 = {
            "fd_write": this.fd_write(abi),
            "fd_close": this.fd_close(abi),
            "fd_seek": this.fd_seek(abi),
            "fd_fdstat_get": this.fd_fdstat_get(abi),
            "environ_sizes_get": this.environ_sizes_get(abi),
            "environ_get": this.environ_get(abi),
            "random_get": this.random_get(abi),
            "proc_exit": this.proc_exit(abi)
        };
        this.imp_wasi_shim = {
            "clock_time_get": this.clock_time_get(abi)
        };
        this.imp_mixrt_host = builtins(abi);  // see builtins.js
        this.stdout = new Array();
        this.stderr = new Array();
    }

    update() {
        this.mem8 = new Uint8Array(this.memory.buffer);
        this.mem32 = new Uint32Array(this.memory.buffer);
    }

    async compile() {
        if (this.state.cached_main_module !== undefined) {
            this.main_module = this.state.cached_main_module;
            return;
        }
        if (this.main instanceof WebAssembly.Module) {
            this.main_module = this.main;
        } else if (this.main instanceof Uint8Array) {
            this.main_module = await WebAssembly.compile(this.main);
        } else {
            // `WebAssembly.compileStreaming` requires that the response has
            // a mime-type of "application/wasm" which cannot be guaranteed
            // in all the environments where we run.
            let response = await this.main;
            let buffer = await response.arrayBuffer();
            this.main_module = await WebAssembly.compile(buffer);
        };
        this.state.cached_main_module = this.main_module;
    }
    
    async instantiate() {
        let imports =
            { "env": this.imp_env,
              "wasi_snapshot_preview1": this.imp_wasi_snapshot_preview1,
              "wasi_shim": this.imp_wasi_shim,
              "mixrt_host": this.imp_mixrt_host
            };
        this.instance = await WebAssembly.instantiate(this.main_module, imports);
        this.memory = this.instance.exports.memory;
        this.update();
        this.instance.exports._initialize();
        this.table = this.instance.exports.__indirect_function_table;
        this.seedRNG();
        this.setDebugFlags();
    }

    async mixLink(mixmod) {
        let groovebox_build_min_a = WebAssembly.Module.customSections(mixmod, "mix_grooveboxBuildMin");
        if (groovebox_build_min_a.length > 0 && "804" != "unset") {
            let gbm = new Int32Array(groovebox_build_min_a[0])[0];
            if (gbm > parseInt("804")) {
                throw new Error("This version of GrooveBox is too old: required build: " + gbm + ", but this is build: " + "804");
            }
        };
        let consts_size_buf = WebAssembly.Module.customSections(mixmod, "mix_constsLength")[0];
        let consts_size = new Int32Array(consts_size_buf)[0];
        let table_size_buf = WebAssembly.Module.customSections(mixmod, "mix_tableLength")[0];
        let table_size = new Int32Array(table_size_buf)[0];
        console.log("consts: ", consts_size);
        console.log("table: " , table_size);
        let consts_addr = this.instance.exports.malloc(consts_size);
        let table_base = this.table.length;
        this.table.grow(table_size);
        let needed = WebAssembly.Module.imports(mixmod);
        let env =
            { table: this.table,
              memory: this.memory,
              mix_consts: consts_addr,
              tableBase: table_base
            };
        let mixrt = {};
        for (let k = 0; k < needed.length; k++) {
            let imp = needed[k];
            switch(imp.module) {
            case "env":
                break;
            case "mixrt":
                if (imp.kind == "function") {
                    let f = this.instance.exports[imp.name];
                    if (f === undefined)
                        throw new Error("missing mixrt function: " + imp.name);
                    mixrt[imp.name] = f;
                };
                break
            default:
                throw new Error("unsupported import: " + imp.module);
            }
        };
        let imports =
            { env: env,
              mixrt: mixrt
            };
        let p = await WebAssembly.instantiate(mixmod, imports);
        p.exports.mix_init();
    }
    
    seedRNG() {
        // set the seed of the PRNG on the C side:
        this.instance.exports.srandom(Math.random() * 0x7fffffff);
    }

    setDebugFlags() {
        // available flags: see memory.h, DEBUG_*
        this.instance.exports.mixrt_setDebugFlags(0);
    }

    setTempRet0(abi) {
        return value => {
            abi.tempRet0 = value;
        }
    }

    proc_exit(abi) {
        return (code) => {
            abi.update();
            console.log("exit(" + code + ")")
        }
    }

    clock_time_get(abi) {
        // this is not exactly the WASI version (which passes precision
        // as int64 which is not always supported in JS), but a wrapper:
        return (clock_id, precision_lsb, precision_msb, ptr) => {
            abi.update();
            if (clock_id != 0) {
                return 28; // EINVAL
            };
            // ignore precision
            let now_ms = Date.now();
            let now_ns = BigInt(now_ms) * 1000000n;
            abi.mem32[ptr >> 2] = Number(now_ns & 0xffffffffn);
            abi.mem32[(ptr >> 2)+1] = Number((now_ns >> 32n) & 0xffffffffn);
            return 0;
        }
    }

    fd_seek(abi) {
        return (fd, offset_low, offset_high, whence, newOffset) => {
            abi.update();
            abi.abort("unexpected fd_seek call");
        }
    }

    fd_write(abi) {
        return (fd, iov, iovcnt, pnum) => {
            abi.update();
            let buffer;
            let logger;
            switch (fd) {
            case 1:
                buffer = abi.stdout;
                logger = console.debug;
                break;
            case 2: // redirect to stdout...
                buffer = abi.stdout;
                logger = console.debug;
                break;
            default:
                return 0;
            }
            let num = 0;
            for (let i = 0; i < iovcnt; i++) {
                let ptr = abi.mem32[((iov)+(i*8))>>2];
                let len = abi.mem32[((iov)+(i*8 + 4))>>2];
                for (let j = 0; j < len; j++) {
                    let byte = abi.mem8[ptr+j];
                    if (byte >= 32)
                        buffer.push(byte)
                    else if (byte == 10) {
                        let uint8 = new Uint8Array(buffer);
                        logger("WASM: %s", abi.utf8array_to_string(uint8, 0, buffer.length));
                        buffer.length = 0;
                    }
                }
                num += len;
            }
            abi.mem32[pnum>>2]=num;
            return 0;
        }
    }

    fd_close(abi) {
        return fd => {
            abi.update();
            return 0;
        }
    }

    fd_fdstat_get(abi) {
        return (fd, buf) => {
            abi.update();
            abi.abort("unexpected fd_fdstat_get call");
        }
    }

    environ_sizes_get(abi) {
        return (ptr_count, ptr_sizes) => {
            abi.update();
            abi.mem32[ptr_count >> 2] = 0;
            return 0;
        }
    }

    environ_get(abi) {
        return (ptr_environ, ptr_environ_buf) => {
            abi.update();
            return 0;
        }
    }

    random_get(abi) {
        return (ptr_buf, size) => {
            abi.update();
            // node's version of getRandom doesn't like to write directly to
            // wasm memory, so this indirection is needed:
            let mem = abi.mem8.subarray(ptr_buf, ptr_buf + size);
            let mem2 = new Uint8Array(size);
            crypto.getRandomValues(mem2);
            mem.set(mem2);
            return 0;
        }
    }

    wasm_abort(abi) {
        return () => {
            abi.update();
            abi.abort("Aborting WASM execution")
        }
    }

    utf8array_to_string(bytes, idx, count) {
        let limit = idx + count;
        let ptr = idx;
        while (bytes[ptr] && ptr < limit) ptr++;
        return new TextDecoder().decode(bytes.subarray(idx, ptr));
    }

    call(f, ...args) {
        if (this === undefined) throw Error("FATAL: 'this' is undefined");
        try {
            let r = f.apply(undefined, args);
            this.update();
            return r;
        } catch (e) {
            let stack = e.stack || "(no stack trace)";
            console.error("WASM EXCEPTION: %s at %s", e.message, stack);
            this.update();
            throw e;
        }
    }

    abort(msg) {
        let e = new Error();
        let stack = e.stack || "(no stack trace)";
        console.error("WASM ABORT: %s at %s", msg, stack);
        throw new WebAssembly.RuntimeError(msg);
    }
}



;// CONCATENATED MODULE: ./js/driver.js





class DrvParams {
    constructor() {
        this.instID = undefined;
        this.codeID = undefined;
        this.timeout = undefined;
        this.which = undefined;
        this.entryID = undefined;
        this.coroutine = undefined;
        this.errorCode = undefined;
        this.errorProxy = undefined;
        this.withResult = undefined;
        this.reference = undefined;
        this.tag = undefined;
        this.modname = undefined;
        this.name = undefined;
        this.location = undefined;
        this.args = undefined;
        this.result = undefined;
        this.message = undefined;
        this.backtrace = undefined;
        this.fgBusy = undefined;
        this.fgBlocked = undefined;
        this.serial = undefined;
        this.time = undefined;
    }

    getInstID() { return this.instID }
    setInstID(x) { this.instID = x }

    getCodeID() { return this.codeID }
    setCodeID(x) { this.codeID = x }

    getTimeout() { return this.timeout }
    setTimeout(x) { this.timeout = x }

    getWhich() { return this.which }
    setWhich(x) { this.which = x }

    getEntryID() { return this.entryID }
    setEntryID(x) { this.entryID = x }

    getCoroutine() { return this.coroutine }
    setCoroutine(x) { this.coroutine = x }

    getErrorCode() { return this.errorCode }
    setErrorCode(x) { this.errorCode = x }

    getErrorProxy() { return this.errorProxy }
    setErrorProxy(x) { this.errorProxy = x }

    getWithResult() { return this.withResult }
    setWithResult(x) { this.withResult = x }

    getReference() { return this.reference }
    setReference(x) { this.reference = x }

    getTag() { return this.tag }
    setTag(x) { this.tag = x }

    getModname() { return this.modname }
    setModname(x) { this.modname = x }

    getName() { return this.name }
    setName(x) { this.name = x }

    getLocation() { return this.location }
    setLocation(x) { this.location = x }
    setLocationTriple(unitID, unitPC, secInstr) {
        let s = "" + unitID + "/" + unitPC + "/" + secInstr;
        this.setLocation(s);
    }

    getArgs() { return this.args }
    setArgs(x) { this.args = x }

    getResult() { return this.result }
    setResult(x) { this.result = x }

    getMessage() { return this.message }
    setMessage(x) { this.message = x }

    getBacktrace() { return this.backtrace }
    setBacktrace(x) { this.backtrace = x }

    getFgBusy() { return this.fgBusy }
    setFgBusy(x) { this.fgBusy = x }

    getFgBlocked() { return this.fgBlocked }
    setFgBlocked(x) { this.fgBlocked = x }

    getSerial() { return this.serial }
    setSerial(x) { this.serial = x }

    getTime() { return this.time }
    setTime(x) { this.time = x }

    encodeMessageType(msgType, buf) {
        this.write16(buf, msgType);
    }

    encode(buf) {
        this.encodeInstID(buf);
        this.encodeTimeout(buf);
        this.encodeCodeID(buf);
        this.encodeReference(buf);
        this.encodeTag(buf);
        this.encodeModname(buf);
        this.encodeArgs(buf);
        this.encodeResult(buf);
        this.encodeName(buf);
        this.encodeLocation(buf);
        this.encodeWhich(buf);
        this.encodeErrorCode(buf);
        this.encodeMessage(buf);
        this.encodeBacktrace(buf);
        this.encodeEntryID(buf);
        this.encodeCoroutine(buf);
        this.encodeErrorProxy(buf);
        this.encodeWithResult(buf);
        this.encodeFgBusy(buf);
        this.encodeFgBlocked(buf);
        this.encodeSerial(buf);
        this.encodeTime(buf);
        buf.push(0, 0);
    }

    encodeInstID(buf) {
        if (this.instID !== undefined) this.wint4(buf, 0x1000, this.instID);
    }

    encodeTimeout(buf) {
        if (this.timeout !== undefined) this.wint4(buf, 0x1001, this.timeout);
    }
    
    encodeCodeID(buf) {
        if (this.codeID !== undefined) this.wint4(buf, 0x1002, this.codeID);
    }

    encodeReference(buf) {
        if (this.reference !== undefined) this.wstr255(buf, 0x1003, this.reference);
    }

    encodeTag(buf) {
        if (this.tag !== undefined) this.wstr255(buf, 0x1004, this.tag);
    }

    encodeModname(buf) {
        if (this.modname !== undefined) this.wstr255(buf, 0x1005, this.modname);
    }

    encodeArgs(buf) {
        if (this.args !== undefined) this.wval(buf, 0x1006, this.args);
    }

    encodeResult(buf) {
        if (this.result !== undefined) this.wval(buf, 0x1007, this.result);
    }
    
    encodeName(buf) {
        if (this.name !== undefined) this.wstr255(buf, 0x1008, this.name);
    }

    encodeLocation(buf) {
        if (this.location !== undefined) this.wstr255(buf, 0x1009, this.location);
    }
    
    encodeWhich(buf) {
        if (this.which !== undefined) this.wint4(buf, 0x100a, this.which);
    }

    encodeErrorCode(buf) {
        if (this.errorCode !== undefined) this.wint4(buf, 0x100b, this.errorCode);
    }
    
    encodeMessage(buf) {
        if (this.message !== undefined) this.wstr65535(buf, 0x100c, this.message);
    }

    encodeBacktrace(buf) {
        if (this.backtrace !== undefined) this.wstr65535(buf, 0x100d, this.backtrace);
    }

    encodeEntryID(buf) {
        if (this.entryID !== undefined) this.wint4(buf, 0x100e, this.entryID);
    }

    encodeCoroutine(buf) {
        if (this.coroutine !== undefined) this.wint4(buf, 0x100f, this.coroutine);
    }

    encodeErrorProxy(buf) {
        if (this.errorProxy !== undefined) this.wint4(buf, 0x1010, this.errorProxy);
    }

    encodeWithResult(buf) {
        if (this.withResult !== undefined) this.wint4(buf, 0x1011, this.withResult ? 1 : 0);
    }
    
    encodeFgBusy(buf) {
        if (this.fgBusy !== undefined) this.wint4(buf, 0x1012, this.fgBusy ? 1 : 0);
    }

    encodeFgBlocked(buf) {
        if (this.fgBlocked !== undefined) this.wint4(buf, 0x1013, this.fgBlocked);
    }

    encodeSerial(buf) {
        if (this.serial !== undefined) this.wint4(buf, 0x1014, this.serial);
    }

    encodeTime(buf) {
        if (this.time !== undefined) this.wint8(buf, 0x1015, this.time);
    }

    wstr255(buf, code, x) {
        let b = new TextEncoder().encode(x);
        if (b.length > 255) throw new Error("Driver: string too large");
        this.write16(buf, code);
        this.write32(buf, b.length);
        for (var p of b) buf.push(p);
    }

    wstr65535(buf, code, x) {
        let b = new TextEncoder().encode(x);
        if (b.length > 65535) b = b.subarray(0, 65536);
        this.write16(buf, code);
        this.write32(buf, b.length);
        for (var p of b) buf.push(p);
    }
    
    wint4(buf, code, x) {
        this.write16(buf, code);
        this.write32(buf, 4);
        this.write32(buf, x);
    }

    wint8(buf, code, x) {
        this.write16(buf, code);
        this.write32(buf, 8);
        this.write64(buf, x);
    }

    wval(buf, code, x) {
        this.write16(buf, code);
        this.write32(buf, x.byteLength);
        for (let v of new Uint8Array(x)) {
            buf.push(v);
        }
    }
    
    write16(buf, x) {
        buf.push(x & 0xff);
        buf.push((x >> 8) & 0xff);
    }

    write32(buf, x) {
        buf.push(x & 0xff);
        buf.push((x >> 8) & 0xff);
        buf.push((x >> 16) & 0xff);
        buf.push((x >> 24) & 0xff);
    }

    write64(buf, x) {
        buf.push(x & 0xff);
        buf.push((x >> 8) & 0xff);
        buf.push((x >> 16) & 0xff);
        buf.push((x >> 24) & 0xff);
        buf.push((x >> 32) & 0xff);
        buf.push((x >> 40) & 0xff);
        buf.push((x >> 48) & 0xff);
        buf.push((x >> 56) & 0xff);
    }

    decodeMessageType(buf) {
        return this.read16(buf);
    }

    decode(buf) {
        let paramType = this.read16(buf);
        while (paramType > 0) {
            switch(paramType) {
            case 0x1000:
                this.instID = this.rint4(buf); break;
            case 0x1001:
                this.timeout = this.rint4(buf); break;
            case 0x1002:
                this.codeID = this.rint4(buf); break;
            case 0x1003:
                this.reference = this.rstr255(buf); break;
            case 0x1004:
                this.tag = this.rstr255(buf); break;
            case 0x1005:
                this.modname = this.rstr255(buf); break;
            case 0x1006:
                this.args = this.rval(buf); break;
            case 0x1007:
                this.result = this.rval(buf); break;
            case 0x1008:
                this.name = this.rstr255(buf); break;
            case 0x1009:
                this.location = this.rstr255(buf); break;
            case 0x100a:
                this.which = this.rint4(buf); break;
            case 0x100b:
                this.errorCode = this.rint4(buf); break;
            case 0x100c:
                this.message = this.rstr65535(buf); break;
            case 0x100d:
                this.backtrace = this.rstr65536(buf); break;
            case 0x100e:
                this.entryID = this.rint4(buf); break;
            case 0x100f:
                this.coroutine = this.rint4(buf); break;
            case 0x1010:
                this.errorProxy = this.rint4(buf); break;
            case 0x1011:
                this.withResult = this.rint4(buf) > 0; break;
            case 0x1012:
                this.fgBusy = this.rint4(buf) !== 0; break;
            case 0x1013:
                this.fgBlocked = this.rint4(buf); break;
            case 0x1014:
                this.serial = this.rint4(buf); break;
            case 0x1015:
                this.time = this.rint8(buf); break;
            default:
                // ignore
            };
            paramType = this.read16(buf);
        }
    }

    rstr255(buf) {
        let len = this.read32(buf);
        if (len > 255) throw new Error("Driver: string too long");
        if (buf.len < len) throw new Error("Driver: message cut off");
        let sub = buf.splice(0, len);
        let tsub = Uint8Array.from(sub);
        let s = new TextDecoder().decode(tsub);
        return s;
    }

    rstr65535(buf) {
        let len = this.read32(buf);
        if (len > 65535) throw new Error("Driver: string too long");
        if (buf.len < len) throw new Error("Driver: message cut off");
        let sub = buf.splice(0, len);
        let tsub = Uint8Array.from(sub);
        let s = new TextDecoder().decode(tsub);
        return s;
    }

    rint4(buf) {
        let len = this.read32(buf);
        if (len != 4) throw new Error("Driver: int field has wrong length");
        return this.read32(buf);
    }

    rint8(buf) {
        let len = this.read32(buf);
        if (len != 8) throw new Error("Driver: int field has wrong length");
        return this.read64(buf);
    }

    rval(buf) {
        let len = this.read32(buf);
        if (len > 0x7fffffff) throw new Error("Driver: string too long");
        if (buf.len < len) throw new Error("Driver: message cut off");
        let sub = buf.splice(0, len);
        return Uint8Array.from(sub);
    }

    read16(buf) {
        if (buf.length < 2) throw new Error("read16: buffer too short");
        let p0 = buf.shift();
        let p1 = buf.shift();
        return p0 | (p1 << 8);
    }

    read32(buf) {
        if (buf.length < 4) throw new Error("read32: buffer too short");
        let p0 = buf.shift();
        let p1 = buf.shift();
        let p2 = buf.shift();
        let p3 = buf.shift();
        return p0 | (p1 << 8) | (p2 << 16) | (p3 << 24);
    }

    read64(buf) {
        if (buf.length < 8) throw new Error("read64: buffer too short");
        let p0 = buf.shift();
        let p1 = buf.shift();
        let p2 = buf.shift();
        let p3 = buf.shift();
        let p4 = buf.shift();
        let p5 = buf.shift();
        let p6 = buf.shift();
        let p7 = buf.shift();
        return p0 | (p1 << 8) | (p2 << 16) | (p3 << 24) |
            (p4 << 32) | (p5 << 40) | (p6 << 48) | (p7 << 56);
    }
}

class DrvMessage {
    constructor(msgType, queue, state) {
        this.msgType = msgType;
        this.params = new DrvParams();
        this.queue = queue;
        this.counter = 0;
        this.state = state.isState();
    }

    encode(rmxType) {
        let buf = new Array();
        this.params.encodeMessageType(this.msgType, buf);
        this.params.encode(buf);
        let buf2 = new Array();
        let totLen = buf.length;
        this.params.write32(buf2, totLen);
        buf2 = buf2.concat(buf);
        this.params.write32(buf2, totLen ^ 0xffffffff);
        let payload = Uint8Array.from(buf2);
        return new globalThis.BinaryMessage(rmxType, "vm", payload);
    }

    async run(instID, chan, serialRef, ffiOverride) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        while (true) {
            //console.log("mixrt_run...", this.counter);
            this.counter++;
            wasm.call(mixrt.mixrt_runYG);
            //console.log("mixrt_run done", this.counter);
            switch (wasm.call(mixrt.mixrt_getState)) {
            case states.STATE_INIT_DONE: {
                let r = new DrvToInitDone(getRequestQueue(wasm), this.state);
                r.params.setInstID(instID);
                await chan.respond(r);
                wasm.call(mixrt.mixrt_reqRunning);
                continue
            }
            case states.STATE_IDLE: {
                // never return this state change to the client:
                let r = new DrvToIdle("internal", this.state);
                r.params.setInstID(instID);
                let busy = wasm.call(mixrt.mixrt_areFGCoroutinesBusy) != 0;
                r.params.setFgBusy(busy);
                r.params.setFgBlocked(wasm.call(mixrt.mixrt_fgBlocked));
                r.params.setSerial(serialRef[0]);
                setTimeout(() => {
                    // wait a little bit before announcing idleness, so that
                    // other states like PANIC are responded first.
                    chan.respond(r);
                }, 10);
                if (!busy && this.state.config.outputViaMQTT) {
                    for (let echo of this.state.drvEcho) {
                        await this.publishEcho(chan, echo);
                    };
                    this.state.drvEcho = new Array();
                };
                return;
            }
            case states.STATE_EXIT: {
                let r = new DrvToExit(getRequestQueue(wasm), this.state);
                r.params.setInstID(instID);
                r.params.setEntryID(wasm.call(mixrt.mixrt_getEntryID));
                let withResult = wasm.call(mixrt.mixrt_getWithResult);
                r.params.setWithResult(withResult);
                if (withResult) {
                    let result_addr = wasm.call(mixrt.mixrt_getResult);
                    let result_buf = copyOutMixValue(this.state.wasm, result_addr);
                    r.params.setResult(result_buf);
                };
                await chan.respond(r);
                wasm.call(mixrt.mixrt_reqRunning);
                continue
            }
            case states.STATE_FFI_CALL: {
                let name_ptr = wasm.call(mixrt.mixrt_getBuiltin);
                let name = copyOutCString(wasm, name_ptr, 255);
                if (this.state.config.outputViaMQTT && name == "$outputWithVersion") {
                    // send this over the "output" channel
                    await this.publishOutput(chan);
                    wasm.call(mixrt.mixrt_reqReturn, wasm.call(mixrt.mixrt_getCoroutine));
                    let retbuf = new Array();
                    importRmxCodec(retbuf, null, newValueDecoder());
                    copyInMixValue(wasm, retbuf);
                    continue;
                };
                if (this.state.config.outputViaMQTT && name == "$outputError") {
                    // send this over the "output" channel
                    await this.publishOutputError(chan);
                    wasm.call(mixrt.mixrt_reqReturn, wasm.call(mixrt.mixrt_getCoroutine));
                    let retbuf = new Array();
                    importRmxCodec(retbuf, null, newValueDecoder());
                    copyInMixValue(wasm, retbuf);
                    continue;
                };
                const localFFI = this.state.config.localFFIs[name];
                if (localFFI !== undefined) {
                    await this.runLocalFFI(instID, chan, serialRef, name, localFFI);
                    return;
                };
                let f = ffiOverride.get(name);
                if (f !== undefined) {
                    this.overriddenFFI(instID, chan, serialRef, ffiOverride, f, name);
                    continue;
                    //throw new Error("stop");
                };
                if (this.state.standalone) {
                    let error = new Error("trying to call an FFI via MQTT but the VM is set to standalone: " + name);
                    let coroutine = wasm.call(mixrt.mixrt_getCoroutine);
                    this.ffiabort(coroutine, error);
                    continue;
                };
                let r = new DrvToFFICall("FFI", this.state);
                r.params.setInstID(instID);
                r.params.setCoroutine(wasm.call(mixrt.mixrt_getCoroutine));
                r.params.setName(name);
                this.setParamsToCurrentLocation(r.params);
                //console.log("args ", exportMixValue(wasm, mixrt.mixrt_getResult()));
                r.params.setArgs(copyOutMixValue(wasm, wasm.call(mixrt.mixrt_getResult)));
                return await chan.fficall(r);
                // NB. We cannot allow a coroutine switch during a synch FFI
                // call. So we MUST leave here the loop.
            }
            case states.STATE_PANIC: {
                let r = new DrvToPanic(getRequestQueue(wasm), this.state);
                r.params.setInstID(instID);
                r.params.setCoroutine(wasm.call(mixrt.mixrt_getCoroutine));
                let code = wasm.call(mixrt.mixrt_getError);
                if (code === undefined) code = 99;
                let msg = copyOutCString(wasm, wasm.call(mixrt.mixrt_getErrorMessage), 65535);
                r.params.setErrorCode(code);
                r.params.setMessage(msg);
                this.setParamsToCurrentLocation(r.params);
                let co_id = wasm.call(mixrt.mixrt_getCoroutine);
                let backtrace_ptr = wasm.call(mixrt.mixrt_co_backtrace, co_id);
                let backtrace = copyOutCString(wasm, backtrace_ptr, 65535);
                wasm.call(mixrt.free, backtrace_ptr);
                r.params.setBacktrace(backtrace);
                if (code === errs.ERR_SEE_PROXY) {
                    r.params.setErrorProxy(wasm.call(mixrt.mixrt_getErrorProxy));
                };
                await chan.respond(r);
                wasm.call(mixrt.mixrt_reqRunning);
                continue
            }
            case states.STATE_TIMEOUT: {
                let r = new DrvToTimeout(getRequestQueue(wasm), this.state);
                r.params.setInstID(instID);
                await chan.respond(r);
                wasm.call(mixrt.mixrt_reqRunning);
                continue;
            }
            }; // switch
            throw new Error("Unexpected state");
        }
    }

    setParamsToCurrentLocation(params) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        let unitID_ptr = wasm.call(mixrt.mixrt_locUnitID);
        let unitID = copyOutCString(wasm, unitID_ptr, 255);
        let unitPC = wasm.call(mixrt.mixrt_locUnitPC);
        let secInstr = wasm.call(mixrt.mixrt_locSecInstr);
        params.setLocationTriple(unitID, unitPC, secInstr);
    }
    
    async publishOutput(chan) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        try {
            let result = wasm.call(mixrt.mixrt_getResult);
            let name_val = wasm.call(mixrt.mixrt_arrayGet, result, 0, 1);
            if (name_val == 0) throw new Error("bad result");
            let name_str = wasm.call(mixrt.mixrt_getString, name_val);
            if (name_str == 0) throw new Error("bad result");
            let name = copyOutCString(wasm, name_str, 255);
            let version_val = wasm.call(mixrt.mixrt_arrayGet, result, 1, 1);
            if (version_val == 0) throw new Error("bad result");
            let version_str = wasm.call(mixrt.mixrt_getString, version_val);
            if (version_str == 0) throw new Error("bad result");
            let version = copyOutCString(wasm, version_str, 255);
            let value_val = wasm.call(mixrt.mixrt_arrayGet, result, 2, 1);
            let value = exportMixValue(wasm, value_val, newJSONEncoder());
            let obj =
                { "cellMessages": [ { "name": name,
                                      "version": version,
                                      "value": value
                                    } ]
                };
            await this.publishMessage(chan, obj);
        } catch (e) {
            console.error("output error", e)
        }
    }

    async publishOutputError(chan) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        try {
            let result = wasm.call(mixrt.mixrt_getResult);
            let errobj_val = wasm.call(mixrt.mixrt_arrayGet, result, 0, 1);
            let errobj = exportMixValue(wasm, errobj_val, newJSONEncoder());
            let obj = { "errors": errobj };
            await this.publishMessage(chan, obj);
        } catch (e) {
            console.error("output error", e)
        }
    }

    async publishEcho(chan, echo) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        let session_ptr = wasm.call(mixrt.mixrt_initEnvGetSession);
        let session = session_ptr == 0 ? "" : copyOutCString(wasm, session_ptr, 255);
        let obj = { "_rmx_echo": echo };
        await this.publishMessage(chan, obj);
    }

    async publishMessage(chan, obj) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        let session_ptr = wasm.call(mixrt.mixrt_initEnvGetSession);
        let session = session_ptr == 0 ? "" : copyOutCString(wasm, session_ptr, 255);
        let msg =
            { "_rmx_type": "msg_response",
              "_rmx_version": "0.0",
              "session": session,
              "machine": this.state.config.vmID,
              "org": this.state.config.org,
              "workspace": this.state.config.workspace,
              "cellMessages": [],
              "logMessages": []
            };
        for (let n in obj) {
            msg[n] = obj[n];
        };
        if (this.state.config.debugMask & debugFlags.DEBUG_OUTPUT)
            console.debug("Output", msg);
        await chan.output(msg);
    }

    ffireturn(coroutine, retval, defaultDecoder) {
        const localFFI = this.state.localFFIs[coroutine] || {};
        delete this.state.localFFIs[coroutine];
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        wasm.call(mixrt.mixrt_reqReturn, coroutine);
        var retbuf;
        if (localFFI.isRaw) {
            retbuf = retval;
        } else {
            retbuf = new Array();
            // if `localFFI.useJsonDecoder` is `false`, the result is
            // clonable-encoded in `machine-starter/src/index.js:FFIComm.return_`
            // and `ffireturn` is called with the clonable decoder in
            // `machine-wasm/js/worker:w_localFfiMsg`. if
            // `localFFI.useJsonDecoder` is `true` the result must be JSON
            // encoded already and is decoded here
            var decoder = localFFI.useJsonDecoder ? newJSONDecoder() : defaultDecoder;
            importRmxCodec(retbuf, retval, decoder);
        }
        copyInMixValue(wasm, retbuf);
    }

    ffiabort(coroutine, error) {
        delete this.state.localFFIs[coroutine];
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        console.error("FFI error: ", error);
        if (error.stack) {
            console.error("FFI backtrace: ", error.stack);
        }
        let msg = error.message;
        let msgbuf = allocCopyInCString(wasm, msg);
        wasm.call(mixrt.mixrt_reqRunning);
        wasm.call(mixrt.mixrt_setErrorMessage, errs.ERR_USER, msgbuf);
        wasm.call(mixrt.free, msgbuf);
        wasm.call(mixrt.mixrt_reqPanicCoroutine, coroutine, 0);
        wasm.call(mixrt.mixrt_abortCoroutinePrimaryYG, coroutine);
    }

    async runLocalFFI(instID, chan, serialRef, name, localFFI) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        let msgthis = this;
        let coroutine = wasm.call(mixrt.mixrt_getCoroutine);
        let args_ptr = wasm.call(mixrt.mixrt_getResult);
        this.state.localFFIs[coroutine] = {name, ...localFFI};
        var args = localFFI.isRaw ?
            copyOutMixValue(wasm, args_ptr) :
            exportMixValue(wasm, args_ptr, newClonableEncoder());
        await chan.fficall_local(name, coroutine, args);
    }

    async overriddenFFI(instID, chan, serialRef, ffiOverride, f, name) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        let sboard = this.state.sboard;
        let msgthis = this;
        let coroutine = wasm.call(mixrt.mixrt_getCoroutine);
        let connector =
            { wasm: wasm,
              mixrt: mixrt,
              state: this.state,
              coroutine: coroutine,
              publishMessage: (async obj => { await msgthis.publishMessage(chan, obj) } ),
            };
        let args_ptr = wasm.call(mixrt.mixrt_getResult);
        let args = exportMixValue(wasm, args_ptr, newValueEncoder());
        try {
            let retval = f(connector, args);
            // the return value can be a promise:
            if (retval instanceof Promise) {
                retval.then(real_retval => {
                    sboard.FFIReturn(coroutine, async function(chan) {
                        msgthis.ffireturn(coroutine, real_retval, newValueDecoder());
                        await msgthis.run(instID, chan, serialRef, ffiOverride);
                    })
                }, error => {
                    sboard.FFIReturn(coroutine, async function(chan) {
                        msgthis.ffiabort(coroutine, error);
                        await msgthis.run(instID, chan, serialRef, ffiOverride);
                    });
                });
                wasm.call(mixrt.mixrt_reqRunning);
            } else
                msgthis.ffireturn(coroutine, retval, newValueDecoder());
        } catch(error) {
            msgthis.ffiabort(coroutine, error);
        }
    }
}

class DrvCreate extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver") throw new Error("DrvCreate: only permitted in queue 'driver'");
        super(0x0101, queue, state);
    }

    async exec(chan, serialRef) {
        if (this.params.instID !== 0) throw new Error("DrvCreate: only one instance supported");
        let mixrt_code = this.state.mixrt_code;
        if (mixrt_code === null) {
            mixrt_code = fetch("./machine-wasm-code.wasm", {cache:"default"});
        }
        let wasm = new ABI(mixrt_code, this.state);
        this.state.wasm = wasm;
        await wasm.compile();
        await wasm.instantiate();
        wasm.call(this.state.wasm.instance.exports.mixrt_setDebugFlags, this.state.config.debugMask);
        console.log("mix machine: Initial debug mask: ", this.state.config.debugMask);
        console.debug("Debug levels (call MixSetMask to change):");
        console.debug("DEBUG_MEMORY       1");
        console.debug("DEBUG_SCHEDULER    2");
        console.debug("DEBUG_STATE        4");
        console.debug("DEBUG_STACK        8");
        console.debug("DEBUG_LOOP        16");
        console.debug("DEBUG_MEMORY_OG   32");
        console.debug("DEBUG_GC          64");
        console.debug("DEBUG_MESSAGES   256");
        console.debug("DEBUG_QUEUES     512");
        console.debug("DEBUG_OUTPUT    1024");
        let mixrt = wasm.instance.exports;
        wasm.call(mixrt.mixrt_mem_init);
        if (this.params.timeout != undefined) {
            if (mixrt.mixrt_setTimeoutForInteraction) {
                wasm.call(mixrt.mixrt_setTimeoutForInteraction, this.params.timeout);
            } else {
                // old way, now deprecated - 2022-10-19
                wasm.call(mixrt.mixrt_setTimeoutForCycle, this.params.timeout);
            }
        }
    }
}

class DrvDestroy extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver") throw new Error("DrvDestroy: only permitted in queue 'driver'");
        super(0x0102, queue, state);
    }

    async exec(chan, serialRef) {}
}

class DrvSendCode extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver") throw new Error("DrvSendCode: only permitted in queue 'driver'");
        super(0x0201, queue, state);
    }

    async exec(chan, serialRef) {
        if (this.params.codeID === undefined)
            throw new Error("DrvSendCode: missing codeID param");
        if (this.params.reference === undefined)
            throw new Error("DrvSendCode: missing reference param");
        let code;
        if (this.params.reference.startsWith("file:")) {
            // node-only
            let filename = this.params.reference.slice(5);
            code = fs.readFileSync(filename);
        } else if (this.params.reference.startsWith("data:")) {
            let resp = await fetch(this.params.reference);
            if (!resp.ok) {
                console.error("Invalid data URL");
                throw new Error("Bad data URL");
            }
            code = await resp.arrayBuffer();
        } else {
            let baseURL = this.state.config.baseURL;
            if (!baseURL.endsWith("/")) baseURL = baseURL + "/";
            let hdr = new Headers();
            let u = this.params.reference;
            if (this.state.config.token != "") {
                //hdr.append("Authorization", "Bearer " + self.state.config.token);
                u += u.includes("?") ? "&" : "?";
                u += "token=" + this.state.config.token;
            }
            let url = new URL(u, this.state.config.baseURL);
            let init = { headers: hdr,
                         // credentials: "include",
                         mode: "cors",
                       };
            let resp = await fetch(url.toString(), init);
            if (!resp.ok) {
                let msg = await resp.text();
                console.error("Cannot load URL:", url.toString(), "status:", resp.status, "Bad body:", msg);
                throw new Error("Bad HTTP status: " + resp.status);
            };
            code = await resp.arrayBuffer();
        };
        let codeBytes = new Uint8Array(code);
        if (codeBytes[0] == 0 && codeBytes[1] == 97 &&
            codeBytes[2] == 115 && codeBytes[3] == 109) {
            let mod = await WebAssembly.compile(code);
            this.state.mixCode.set(this.params.codeID, mod);
        } else {
            // TODO: isByteCode check
            if (this.params.name === undefined)
                throw new Error("DrvSendCode: missing name param");
            let wasm = this.state.wasm;
            let mixrt = wasm.instance.exports;
            let n = codeBytes.length;
            let ptr = wasm.call(mixrt.malloc, n);
            if (ptr == 0) {
                throw new Error("out of memory");
            }
            wasm.mem8.subarray(ptr, ptr+n).set(codeBytes);
            let ptr_unit = allocCopyInCString(wasm, this.params.name);
            let no_validation = this.state.config.quickLoad;
            let bc = wasm.call(mixrt.mixrt_interpreterAddCode2, ptr, ptr+n,
                               ptr_unit, ptr_unit, no_validation);
            if (bc == 0) {
                let msg = copyOutCString(wasm, wasm.call(mixrt.mixrt_getErrorMessage), 65535);
                throw new Error(msg);
            };
            this.state.mixCode.set(this.params.codeID, "BYTE");
            this.state.haveByteCode = true;
        }
    }
}

class DrvUnload extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver") throw new Error("DrvUnload: only permitted in queue 'driver'");
        super(0x0202, queue, state);
    }

    async exec(chan, serialRef) {
        if (this.params.codeID === undefined)
            throw new Error("DrvUnload: missing codeID param");
        this.state.mixCode.delete(this.params.codeID);
    }
}

class DrvLinkCode extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver") throw new Error("DrvLinkCode: only permitted in queue 'driver'");
        super(0x0203, queue, state);
    }

    async exec(chan, serialRef) {
        if (this.params.instID !== 0) throw new Error("DrvLinkCode: only one instance supported");
        if (this.params.codeID === undefined)
            throw new Error("DrvLinkCode: missing codeID param");
        let mod = this.state.mixCode.get(this.params.codeID);
        if (mod === undefined)
            throw new Error("DrvLinkCode: unknown code reference");
        if (mod != "BYTE")
            await this.state.wasm.mixLink(mod);
    }
}

class DrvSynchronize extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver") throw new Error("DrvSynchronize: only permitted in queue 'driver'");
        super(0x0300, queue, state);
    }

    async exec(chan, serialRef) {
        let r;
        if (this.state.postponedError != null) {
            r = this.state.postponedError;
            this.state.postponedError = null;
        } else {
            r = new DrvSynchronized(this.queue, this.state);
        };
        r.params.setInstID(this.params.instID);
        await chan.respond(r);
    }
}

class DrvToInit extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver") throw new Error("DrvToInit: only permitted in queue 'driver'");
        super(0x0301, queue, state);
    }

    async exec(chan, serialRef, ffiOverride) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        let s = wasm.call(mixrt.mixrt_getState);
        if (s !== states.STATE_INIT && s !== states.STATE_INIT_DONE && s !== states.STATE_EXIT && s !== states.STATE_IDLE) {
            throw new Error("state mismatch after ToInit: " + s);
        }
        if (this.state.haveByteCode) {
            console.log("call link")
            let ok = wasm.call(mixrt.mixrt_interpreterLinkCodeYG);
            if (!ok) {
                let msg = copyOutCString(wasm, wasm.call(mixrt.mixrt_getErrorMessage), 65535);
                throw new Error(msg);
            }
        };
        wasm.call(mixrt.mixrt_reqInit);
        setRequestQueue(wasm, this.queue);
        if (this.params.serial !== undefined)
            serialRef[0] = this.params.serial;
        if (this.params.args !== undefined) {
            let args = this.params.args;
            let io = copyInMixValue(wasm, args);
            let val = wasm.call(mixrt.mixrt_copyIOtoYG, io, io, io+args.length);
            if (val == 0) throw new Error("cannot create value");
            wasm.call(mixrt.mixrt_initEnvExtract, val);
            this.state.standalone = wasm.call(mixrt.mixrt_initEnvStandalone);
            if (this.state.standalone)
                update_ffis_if_standalone(ffiOverride);
        };
        await this.run(this.params.instID, chan, serialRef, ffiOverride);
    }
}

class DrvToEnter extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver" && queue != "async")
            throw new Error("DrvToEnter: only permitted in queues 'driver' and 'async'");
        super(0x0302, queue, state);
    }

    async exec(chan, serialRef, ffiOverride) {
        if (this.params.tag === undefined)
            throw new Error("DrvToEnter: missing param: tag");
        if (this.params.modname === undefined)
            throw new Error("DrvToEnter: missing param: modname");
        if (this.params.entryID === undefined)
            throw new Error("DrvToEnter: missing param: entryID");
        if (this.params.args === undefined)
            throw new Error("DrvToEnter: missing args");
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        let tag_ptr = allocCopyInCString(wasm, this.params.tag);
        let modname_ptr = allocCopyInCString(wasm, this.params.modname);
        let e = wasm.call(mixrt.mixrt_findEntry, tag_ptr, modname_ptr);
        free(wasm, tag_ptr);
        free(wasm, modname_ptr);
        if (e == 0) {
            throw new Error("DrvToEnter: cannot find entry, tag="+this.params.tag+" modname="+this.params.modname);
        }
        wasm.call(mixrt.mixrt_reqEntry, e, this.params.entryID, mapRequestQueue(wasm, this.queue), this.params.withResult ? 1 : 0);
        copyInMixValue(wasm, this.params.args);
        if (this.params.serial !== undefined)
            serialRef[0] = this.params.serial;
        await this.run(this.params.instID, chan, serialRef, ffiOverride);
    }
}

class DrvReturn extends DrvMessage {
    constructor(queue, state) {
        if (queue != "FFI") throw new Error("DrvReturn: only permitted in queue 'FFI'");
        super(0x0303, queue, state);
    }

    async exec(chan, serialRef, ffiOverride) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        if (this.params.coroutine === undefined)
            throw new Error("DrvReturn: missing param: coroutine");
        if (this.params.result === undefined)
            throw new Error("DrvReturn: missing param: result");
        wasm.call(mixrt.mixrt_reqReturn, this.params.coroutine);
        copyInMixValue(wasm, this.params.result);
        await this.run(this.params.instID, chan, serialRef, ffiOverride);
    }
}

class DrvAbort extends DrvMessage {
    constructor(queue, state) {
        if (queue != "FFI") throw new Error("DrvAbort: only permitted in queue 'FFI'");
        super(0x0305, queue, state);
    }

    async exec(chan, serialRef, ffiOverride) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        if (this.params.coroutine === undefined)
            throw new Error("DrvAbort: missing param: coroutine");
        if (!wasm.call(mixrt.mixrt_co_exists, this.params.coroutine))
            throw new Error("DrvAbort: no such coroutine: " + this.params.coroutine);
        let message = this.params.message;
        if (message === undefined) message = "<no message provided>";
        let msgbuf = allocCopyInCString(wasm, message);
        wasm.call(mixrt.mixrt_reqRunning);
        if (this.params.errorProxy !== undefined) {
            wasm.call(mixrt.mixrt_setErrorMessageAndProxy, this.params.errorProxy, msgbuf);
        } else {
            wasm.call(mixrt.mixrt_setErrorMessage, errs.ERR_USER, msgbuf);
        }
        wasm.call(mixrt.free, msgbuf);
        wasm.call(mixrt.mixrt_reqPanicCoroutine, this.params.coroutine, 0);
        wasm.call(mixrt.mixrt_abortCoroutinePrimaryYG, this.params.coroutine);
        await this.run(this.params.instID, chan, serialRef, ffiOverride);
    }
}

class DrvLater extends DrvMessage { // like resume
    constructor(queue, state) {
        if (queue != "FFI") throw new Error("DrvLater: only permitted in queue 'FFI'");
        super(0x0309, queue, state);
    }

    async exec(chan, serialRef, ffiOverride) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        wasm.call(mixrt.mixrt_reqRunning);
        await this.run(this.params.instID, chan, serialRef, ffiOverride);
    }
}

class DrvWantResult extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver") throw new Error("DrvWantResult: only permitted in queue 'driver'");
        super(0x0307, queue, state);
    }

    async exec(chan, serialRef) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        let r = new DrvResult(this.queue, this.state);
        r.params.setInstID(this.params.instID);
        let result = wasm.call(mixrt.mixrt_getResult);
        if (result != 0) {
            r.params.setResult(copyOutMixValue(wasm, result));
        };
        await chan.respond(r);
    }
}

class DrvWantLocation extends DrvMessage {
    constructor(queue, state) {
        if (queue != "driver") throw new Error("DrvWantLocation: only permitted in queue 'driver'");
        super(0x0308, queue, state);
    }

    async exec(chan, serialRef) {
        let wasm = this.state.wasm;
        let mixrt = wasm.instance.exports;
        if (this.params.coroutine === undefined)
            throw new Error("DrvWantLocation: missing param: coroutine");
        let r = new DrvLocation(this.queue, this.state);
        if (wasm.call(mixrt.mixrt_co_exists, this.params.coroutine)) {
            r.params.setCoroutine(this.params.coroutine);
            let pc = wasm.call(mixrt.mixrt_co_getLastPC, this.params.coroutine);
            let unitID_ptr = wasm.call(mixrt.mixrt_sectionUnitID, pc);
            let unitPC = wasm.call(mixrt.mixrt_sectionUnitPC, pc);
            if (unitID_ptr != 0) {
                let unitID = copyOutCString(wasm, unitID_ptr, 255);
                r.params.setLocationTriple(unitID, unitPC, 0);
                let backtrace_ptr = wasm.call(mixrt.mixrt_co_backtrace, this.params.coroutine);
                let backtrace = copyOutCString(wasm, backtrace_ptr, 65535);
                wasm.call(mixrt.free, backtrace_ptr);
                r.params.setBacktrace(backtrace);
            }
        };
        await chan.respond(r);
    }
}

class DrvPing extends DrvMessage {
    constructor(queue, state) {
        if (queue != "async") throw new Error("DrvPing: only permitted in queue 'async'");
        super(0x030a, queue, state);
    }

    async exec(chan, serialRef) {
        // ignore this.params.time for now
        let r = new DrvPong(this.queue, this.state);
        r.params.setInstID(this.params.instID);
        await chan.respond(r);
    }
}

class DrvSynchronized extends DrvMessage {
    constructor(queue, state) {
        super(0x0400, queue, state);
    }
}

class DrvError extends DrvMessage {
    constructor(queue, state) {
        super(0x0401, queue, state);
    }
}

class DrvToIdle extends DrvMessage {
    constructor(queue, state) {
        super(0x0402, queue, state);
    }
}

class DrvToExit extends DrvMessage {
    constructor(queue, state) {
        super(0x0403, queue, state);
    }
}

class DrvToInitDone extends DrvMessage {
    constructor(queue, state) {
        super(0x0404, queue, state);
    }
}

class DrvToTimeout extends DrvMessage {
    constructor(queue, state) {
        super(0x0405, queue, state);
    }
}

class DrvToFFICall extends DrvMessage {
    constructor(queue, state) {
        if (state.standalone)
            console.error("trying to call an FFI via MQTT but the VM is set to standalone");
        super(0x0406, queue, state);
    }
}

class DrvToPanic extends DrvMessage {
    constructor(queue, state) {
        super(0x0408, queue, state);
    }
}

class DrvResult extends DrvMessage {
    constructor(queue, state) {
        super(0x0409, queue, state);
    }
}

class DrvLocation extends DrvMessage {
    constructor(queue, state) {
        super(0x040a, queue, state);
    }
}

class DrvPong extends DrvMessage {
    constructor(queue, state) {
        super(0x040b, queue, state);
    }
}

function DrvDecoder(msg, queue, state) {
    if (msg.rmxType !== "msg_mixDriver" && msg.rmxType !== "msg_mixFFI")
        throw new Error("Driver: got message with bad _rmx_type");
    let buf = Array.from(msg.payload);
    let params = new DrvParams();
    let totLen = params.read32(buf);
    if (buf.length != totLen + 4)
        throw new Error("Driver: bad length field in message");
    let msgType = params.decodeMessageType(buf);
    let drvMsg;
    switch(msgType) {
    case 0x0101:
        drvMsg = new DrvCreate(queue, state); break;
    case 0x0102:
        drvMsg = new DrvDestroy(queue, state); break;
    case 0x0201:
        drvMsg = new DrvSendCode(queue, state); break;
    case 0x0202:
        drvMsg = new DrvUnload(queue, state); break;
    case 0x0203:
        drvMsg = new DrvLinkCode(queue, state); break;
    case 0x0300:
        drvMsg = new DrvSynchronize(queue, state); break;
    case 0x0301:
        drvMsg = new DrvToInit(queue, state); break;
    case 0x0302:
        drvMsg = new DrvToEnter(queue, state); break;
    case 0x0303:
        drvMsg = new DrvReturn(queue, state); break;
    case 0x0305:
        drvMsg = new DrvAbort(queue, state); break;
    case 0x0307:
        drvMsg = new DrvWantResult(queue, state); break;
    case 0x0308:
        drvMsg = new DrvWantLocation(queue, state); break;
    case 0x0309:
        drvMsg = new DrvLater(queue, state); break;
    case 0x030a:
        drvMsg = new DrvPing(queue, state); break;
    case 0x0400:
        drvMsg = new DrvSynchronized(queue, state); break;
    case 0x0401:
        drvMsg = new DrvError(queue, state); break;
    case 0x0402:
        drvMsg = new DrvToIdle(queue, state); break;
    case 0x0403:
        drvMsg = new DrvToExit(queue, state); break;
    case 0x0404:
        drvMsg = new DrvToInitDone(queue, state); break;
    case 0x0405:
        drvMsg = new DrvToTimeout(queue, state); break;
    case 0x0406:
        drvMsg = new DrvToFFICall(queue, state); break;
    case 0x0408:
        drvMsg = new DrvToPanic(queue, state); break;
    case 0x0409:
        drvMsg = new DrvResult(queue, state); break;
    case 0x040a:
        drvMsg = new DrvLocation(queue, state); break;
    case 0x040b:
        drvMsg = new DrvPong(queue, state); break;
    default:
        throw new Error("Driver: unknown message type: " + msgType);
    }
    drvMsg.params = params;
    params.decode(buf);
    let againLen = params.read32(buf);
    if (buf.length > 0)
        throw new Error("Driver: message has undecoded rest");
    return drvMsg;
}



;// CONCATENATED MODULE: ./js/ffi.js
// FFIs implemented in JS context

// FFIs can directly return a value, or a promise resolving to a value.
// In the latter case, the FFI is async (needed for I/O etc.).

// The connector object has:
// { wasm, mixrt, state, coroutine }




function ffi_co_sleep(connector, args) {
    let seconds = args[0];
    return new Promise(resolve => {
        // TODO: for quicker releasing resources, we could check every 60
        // seconds whether the machine is not terminated
        setTimeout(function() {
            resolve(null);
        }, seconds * 1000);
    })
}

function ffi_isSyncEnabled(connector, args) {
    return connector.wasm.call(connector.mixrt.mixrt_initEnvGetSyncProtocol) > 0;
}

function ffi_mqtt_available(connector, args) {
    return connector.wasm.call(connector.mixrt.mixrt_initEnvGetMQTTEnabled) != 0;
}

function ffi_showHook(connector, args) {
    return null
}

function ffi_hideHook(connector, args) {
    return null
}

async function ffi_log(connector, args) {
    let severity = args[0].toString();
    let text = args[1].toString();
    let obj =
        { "logMessages": [ { "severity": severity,
                             "text": text
                           }]
        };
    await connector.publishMessage(obj)
}

function b64EncodeUnicode(str) {
    // from https://developer.mozilla.org/en-US/docs/Glossary/Base64
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

class HTTPError extends Error {
    constructor (msg) {
        super(msg)
    }
}

function tokenForCleartextAuth(connector, key, token, host) {
    if (typeof(token) == "string") return token;
    if (!(token instanceof Token)) throw new Error("http.doRequest: config key '" + key + "' must be a token");
    let host_ptr = allocCopyInCString(connector.wasm, host);
    let ok = connector.wasm.call(connector.mixrt.mixrt_tokenOkForCleartextAuth, token.enabled, host_ptr, 0);
    free(connector.wasm, host_ptr);
    if (!ok) throw new HTTPError("http.doRequest: this token is not enabled for this type of authentication");
    return new TextDecoder().decode(token.data);
}

function canonicalizeHeaderName(name) {
    let comps = name.split("-");
    let canon_comps = comps.map(s => {
        let t = s.toLowerCase();
        if (t != "") {
            t = s.substring(0,1).toUpperCase() + s.substring(1);
        };
        return t;
    });
    return canon_comps.join("-");
}

function ffi_http_do_client(connector, args) {
    try {
        if (args.length != 1 || typeof(args[0]) != "object")
            throw new Error("http.doRequest: argument must be an object");
        let config = args[0];
        let reqOpts =
            { "method": "GET",
              "headers": new Headers(),
            };
        if (typeof(config["method"]) == "string")
            reqOpts.method = config["method"];
        let urlObj;
        try {
            // TODO: Remove `remix:` once DB FFIs become possible to implement
            let allowedProtocols = ["https:", "remix:"]
            if (self.state.config.allowInsecureHttp) {
                allowedProtocols.push("http:")
            }
            urlObj = configGetURL(config, allowedProtocols, "http.doRequest");
        } catch (e) {
            throw new HTTPError(e.message);
        };
        let body = config["body"];
        if (body !== undefined) {
            if (typeof(body) != "string" && !(body instanceof Uint8Array))
                throw new Error("http.doRequest: config key 'body' must be a string");
            reqOpts["body"] = body;
        };
        let oauthToken = config["oauthToken"];
        if (oauthToken !== undefined) {
            let tok = tokenForCleartextAuth(connector, "oauthToken", oauthToken, urlObj.hostname);
            reqOpts.headers.set("Authorization", "Bearer " + tok);
            reqOpts.credentials = "same-origin";
        };
        let basicAuth = config["basicAuth"];
        if (basicAuth !== undefined) {
            if (typeof(basicAuth) != "object")
                throw new Error("http.doRequest: config key 'basicAuth' must be an object");
            let username = basicAuth["username"];
            if (typeof(username) != "string")
                throw new Error("http.doRequest: config key 'basicAuth.username' must be a string");
            let password = basicAuth["password"];
            let pw_tok = tokenForCleartextAuth(connector, "basicAuth.password", password, urlObj.hostname);
            let encoded = b64EncodeUnicode(username + ":" + pw_tok);
            reqOpts.headers.set("Authorization", "Basic " + encoded);
            reqOpts.credentials = "include";
        };
        let headers = config["headers"];
        if (typeof(headers) == "object") {
            for (let hname in headers) {
                let hval = headers[hname];
                if (typeof(hval) != "string")
                    throw new Error("http.doRequest: bad header in config object: " + hname);
                reqOpts.headers.set(hname, hval);
            }
        };
        reqOpts.referrer = "no-referrer";
        let req = new Request(urlObj, reqOpts);
        let fetcher = (resp => resp.text());
        if (config.returnBinaryResponseBody === true)
            fetcher = (resp => resp.arrayBuffer().then(b => new Uint8Array(b)));
        // TODO: support for config["timeout"]
        return fetch(req).then(response => {
            return fetcher(response).then(body => {
                let rheaders = {};
                for (let [hname, hval] of response.headers.entries()) {
                    rheaders[canonicalizeHeaderName(hname)] = hval;
                }
                let result =
                    { "status": response.status,
                      "headers": rheaders,
                      "requested_url": urlObj.toString(),
                      "body": body,
                    };
                return result;
            })
        }).catch(e => {
            return {"error": e.message}
        })
    } catch (e) {
        if (e instanceof HTTPError) {
            return {"error": e.message}
        } else {
            throw e
        }
    }
}

function stringOrBinaryOrToken(connector, function_name, v, check_token) {
    if (typeof(v) == "string") {
        return new TextEncoder().encode(v); // returns Uint8Array, too
    } else if (v instanceof Uint8Array) {
        return v;
    } else if (v instanceof Token) {
        check_token(connector, v);
        return v.data;
    } else {
        throw new Error(function_name + ": parameter is neither string nor binary nor token");
    }
}

function anything_goes(connector, tok) {
    return null;
}

function need_tostring(connector, tok) {
    let ok = connector.wasm.call(connector.mixrt.mixrt_tokenOfForConvToString, tok.enabled, 0);
    if (!ok) throw new Error("missing privilege for token parameter: TOSTRING");
}

function need_signing(connector, tok) {
    let ok = connector.wasm.call(connector.mixrt.mixrt_tokenOfForSigning, tok.enabled, 0);
    if (!ok) throw new Error("missing privilege for token parameter: SIGNING");
}

function need_verifying(connector, tok) {
    let ok = connector.wasm.call(connector.mixrt.mixrt_tokenOfForVerifying, tok.enabled, 0);
    if (!ok) throw new Error("missing privilege for token parameter: VERIFYING");
}

function need_encrypt(connector, tok) {
    let ok = connector.wasm.call(connector.mixrt.mixrt_tokenOfForEncryptionKey, tok.enabled, 0);
    if (!ok) throw new Error("missing privilege for token parameter: ENCRYPTION_KEY");
}

function need_decrypt(connector, tok) {
    let ok = connector.wasm.call(connector.mixrt.mixrt_tokenOfForDecryptionKey, tok.enabled, 0);
    if (!ok) throw new Error("missing privilege for token parameter: DECRYPTION_KEY");
}

function equal_binary(buf1, buf2) {
    if (buf1.length != buf2.length) return false;
    for (let k = 0; k < buf1.length; k++) {
        if (buf1[k] !== buf2[k]) return false;
    };
    return true;
}

function ffi_cryptoSHA1Sum(connector, args) {
    if (args[0] === undefined) return undefined;
    let buf = stringOrBinaryOrToken(connector, "$crypto_SHA1Sum", args[0], need_tostring);
    return crypto.subtle.digest("SHA-1", buf.buffer).then(b => {
        return new Uint8Array(b);
    });
}

function ffi_cryptoSHA256Sum(connector, args) {
    if (args[0] === undefined) return undefined;
    let buf = stringOrBinaryOrToken(connector, "$crypto_SHA256Sum", args[0], anything_goes);
    return crypto.subtle.digest("SHA-256", buf.buffer).then(b => {
        return new Uint8Array(b);
    });
}

function ffi_cryptoHMACSHA1Sign(connector, args) {
    if (args[0] === undefined || args[1] === undefined) return undefined;
    let key = stringOrBinaryOrToken(connector, "$crypto_HMACSHA1Sign", args[0], need_signing);
    let msg = stringOrBinaryOrToken(connector, "$crypto_HMACSHA1Sign", args[1], anything_goes);
    return crypto.subtle.importKey("raw", key, {name:"HMAC", hash:"SHA-1"}, false, ["sign"]).then(ikey => {
        return crypto.subtle.sign("HMAC", ikey, msg)
    }).then(b => {
        return new Uint8Array(b);
    });
}

function ffi_cryptoHMACSHA1Verify(connector, args) {
    if (args[0] === undefined || args[1] === undefined) return undefined;
    let key = stringOrBinaryOrToken(connector, "$crypto_HMACSHA1Verify", args[0], need_verifying);
    let msg = stringOrBinaryOrToken(connector, "$crypto_HMACSHA1Verify", args[1], anything_goes);
    let mac = stringOrBinaryOrToken(connector, "$crypto_HMACSHA1Verify", args[2], need_tostring);
    return crypto.subtle.importKey("raw", key, {name:"HMAC", hash:"SHA-1"}, false, ["sign"]).then(ikey => {
        return crypto.subtle.sign("HMAC", ikey, msg)
    }).then(b => {
        let ok = equal_binary(mac, new Uint8Array(b));
        return ok;
    });
}

function ffi_cryptoHMACSHA256Sign(connector, args) {
    if (args[0] === undefined || args[1] === undefined) return undefined;
    let key = stringOrBinaryOrToken(connector, "$crypto_HMACSHA256Sign", args[0], need_signing);
    let msg = stringOrBinaryOrToken(connector, "$crypto_HMACSHA256Sign", args[1], anything_goes);
    return crypto.subtle.importKey("raw", key, {name:"HMAC", hash:"SHA-256"}, false, ["sign"]).then(ikey => {
        return crypto.subtle.sign("HMAC", ikey, msg)
    }).then(b => {
        return new Uint8Array(b);
    });
}

function ffi_cryptoHMACSHA256Verify(connector, args) {
    if (args[0] === undefined || args[1] === undefined) return undefined;
    let key = stringOrBinaryOrToken(connector, "$crypto_HMACSHA256Verify", args[0], need_verifying);
    let msg = stringOrBinaryOrToken(connector, "$crypto_HMACSHA256Verify", args[1], anything_goes);
    let mac = stringOrBinaryOrToken(connector, "$crypto_HMACSHA256Verify", args[2], need_tostring);
    return crypto.subtle.importKey("raw", key, {name:"HMAC", hash:"SHA-256"}, false, ["sign"]).then(ikey => {
        return crypto.subtle.sign("HMAC", ikey, msg)
    }).then(b => {
        let ok = equal_binary(mac, new Uint8Array(b));
        return ok;
    });
}

function ffi_cryptoAESGCMEncrypt(connector, args) {
    if (args[0] === undefined || args[2] === undefined) return undefined;
    const nonce_length = 12;  // 96 bits
    let nonce_buf = new Uint8Array(nonce_length);
    crypto.getRandomValues(nonce_buf);
    let key = stringOrBinaryOrToken(connector, "$crypto_AESGCMEncrypt", args[0], need_encrypt);
    let auth_data;
    if (args[1] !== undefined && args[1] !== null)
        auth_data = stringOrBinaryOrToken(connector, "$crypto_AESGCMEncrypt", args[1], need_tostring);
    let msg = stringOrBinaryOrToken(connector, "$crypto_AESGCMEncrypt", args[2], need_tostring);
    return crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]).then(ikey => {
        return crypto.subtle.encrypt({name:"AES-GCM", iv:nonce_buf, additionalData:auth_data}, ikey, msg)
    }).then(ciphertext => {
        let cbuf = new Uint8Array(ciphertext);
        let r = new Uint8Array(ciphertext.byteLength + nonce_length);
        r.set(nonce_buf);
        r.set(cbuf, nonce_length);
        return new Case("ok", r);
    }).catch(e => {
        return new Case("error", e.message)
    })
}

function ffi_cryptoAESGCMDecrypt(connector, args) {
    if (args[0] === undefined || args[2] === undefined) return undefined;
    const nonce_length = 12;  // 96 bits
    let key = stringOrBinaryOrToken(connector, "$crypto_AESGCMDecrypt", args[0], need_encrypt);
    let auth_data;
    if (args[1] !== undefined && args[1] !== null)
        auth_data = stringOrBinaryOrToken(connector, "$crypto_AESGCMDecrypt", args[1], need_tostring);
    let msg = stringOrBinaryOrToken(connector, "$crypto_AESGCMDecrypt", args[2], need_tostring);
    if (msg.byteLength < nonce_length)
        return new Case("error", "message too short");
    let nonce_buf = new Uint8Array(nonce_length);
    nonce_buf.set(msg.subarray(0, nonce_length));
    return crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]).then(ikey => {
        let cbuf = new Uint8Array(msg.byteLength - nonce_length);
        cbuf.set(msg.subarray(nonce_length));
        return crypto.subtle.decrypt({name:"AES-GCM", iv:nonce_buf, additionalData:auth_data}, ikey, cbuf)
    }).then(plaintext => {
        return new Case("ok", new Uint8Array(plaintext));
    }).catch(e => {
        return new Case("error", e.message)
    })
}

function ffi_cryptoRandomKey32(connector, args) {
    let ta = new Uint8Array(32);
    crypto.getRandomValues(ta);
    return ta;
}

async function wasmInstantiate(wasm) {
    let {instance} = await WebAssembly.instantiate(wasm);
    if (instance.exports._rmx_allocate === undefined || instance.exports._rmx_deallocate === undefined) {
        ffi_wasmError("allocation/deallocation functions unavailable");
    }
    return instance;
}

function wasmCall(exports, fun, args) {
    let memoryBuffer = exports.memory.buffer;

    let argsBuf = new Array(); // bytes
    importRmxCodec(argsBuf, args, newValueDecoder());
    let argsBufLen = argsBuf.length;

    let argsPtr = exports._rmx_allocate(argsBuf.length + 4);

    // the WASM memory at `argsPtr` must contain the number of bytes of the
    // encoded arguments as uint32 (4 bytes) followed by the encoded arguments
    let argsMem32 = new Uint32Array(exports.memory.buffer, argsPtr);
    let argsMem8 = new Uint8Array(exports.memory.buffer, argsPtr+4);
    argsMem32[0] = argsBufLen;
    argsMem8.set(argsBuf);

    let resPtr = fun(argsPtr);

    // the WASM memory at `resPtr` contains the number of bytes of the encoded
    // result as uint32 (4 bytes) followed by the encoded result
    let resMem32 = new Uint32Array(exports.memory.buffer, resPtr);
    let resBufLen = resMem32[0];
    let resMem32Buf = resMem32.subarray(1, 1 + resBufLen/4);
    let res = exportRmxCodec(resMem32Buf, 0, newValueEncoder());

    exports._rmx_deallocate(argsPtr, argsBuf.length + 4);
    exports._rmx_deallocate(resPtr, resBufLen + 4);

    if (!res instanceof Case) {
        ffi_wasmError("Wasm call must return a case, actually got a " + res.constructor.name);
    }
    switch (res.name) {
    case "ok":
        return res.arg;
    case "error":
        ffi_wasmError("Wasm call failed: " + res.arg);
    default:
        ffi_wasmError("Wasm call must return a result case, actually got a case " + res.name);
    }
}

function ffi_extra_isFFI(conn, args) {
    return false;
}

function ffi_extra_dispatch(conn, args) {
    throw new Error("Extra functions are not dispatched but called from resource rmx_extra.wasm");
}

async function ffi_loadResource(conn, args) {
    let [name] = args;
    if (globalThis.ThisIsNode === true) {
        if (name == "rmx_extra.wasm") {
            return new Case("ok", globalThis.mixextra_code);
        } else {
            return new Case("error", "resource unavailable in node: " + name);
        }
    } else {
        let resp = await fetch(new URL("./" + name, self.location), {cache: "default"});
        if (resp.ok) {
            return new Case("ok", resp.arrayBuffer());
        } else {
            return new Case("error", "cannot fetch resource: " + name);
        }
    }
}

function ffi_wasmError(msg) {
    throw new Error("WASM FFI: " + msg);
}

class WasmFFI {
    constructor(instance) {
        this.instance = instance;
        this.functions = [];
    }
    static async load(wasm) {
        let instance = await wasmInstantiate(wasm);
        return new WasmFFI(instance);
    }
    fun(name) {
        let fun = this.instance.exports[name];
        if (fun === undefined) {
            ffi_wasmError("function not found: " + name);
        }
        let funIndex = this.functions.length;
        this.functions.push(fun);
        return funIndex;
    }
    call(funIndex, args) {
        if (funIndex < 0 || this.functions.length <= funIndex) {
            ffi_wasmError("invalid function");
        }
        let fun = this.functions[funIndex];
        return wasmCall(this.instance.exports, fun, args);
    }
}

const wasmFFIs = {
    wasms: [],
    load: async function(connector, args) {
        let [wasm] = args;
        let wasmFFI = await WasmFFI.load(wasm);
        let ffiIndex = this.wasms.length;
        this.wasms.push(wasmFFI);
        return ffiIndex;
    },
    fun: function(connector, args) {
        let [ffiIndex, name] = args;
        if (ffiIndex < 0 || this.wasms.length <= ffiIndex) {
            ffi_wasmError("invalid instance");
        }
        let funIndex = this.wasms[ffiIndex].fun(name);
        return [ffiIndex, funIndex]
    },
    call: function(connector, args) {
        let [[ffiIndex, funIndex], ffiArgs] = args;
        if (ffiIndex < 0 || this.wasms.length <= ffiIndex) {
            ffi_wasmError("invalid instance");
        }
        let entry = this.wasms[ffiIndex];
        if (entry === undefined) {
            ffi_wasmError("FFI has been shutdown");
        }
        let wasmFFI = entry;
        return entry.call(funIndex, ffiArgs);
    },
    shutdown: function(connector, args) {
        let [ffiIndex] = args;
        if (ffiIndex < 0 || this.wasms.length <= ffiIndex) {
            ffi_wasmError("invalid instance");
        }
        delete this.wasms[ffiIndex];
    }
}

function ffis() {
    let m = new Map();
    m.set("$co_sleep", ffi_co_sleep);
    m.set("$isSyncEnabled", ffi_isSyncEnabled);
    m.set("$mqtt_available", ffi_mqtt_available);
    m.set("$showHook", ffi_showHook);
    m.set("$hideHook", ffi_hideHook);
    m.set("$log", ffi_log);
    m.set("$http_do", ffi_http_do_client);
    m.set("$http_do_client", ffi_http_do_client);
    m.set("$crypto_SHA1Sum", ffi_cryptoSHA1Sum);
    m.set("$crypto_SHA256Sum", ffi_cryptoSHA256Sum);
    m.set("$crypto_HMACSHA1Sign", ffi_cryptoHMACSHA1Sign);
    m.set("$crypto_HMACSHA1Verify", ffi_cryptoHMACSHA1Verify);
    m.set("$crypto_HMACSHA256Sign", ffi_cryptoHMACSHA256Sign);
    m.set("$crypto_HMACSHA256Verify", ffi_cryptoHMACSHA256Verify);
    m.set("$crypto_AESGCMEncrypt",  ffi_cryptoAESGCMEncrypt);
    m.set("$crypto_AESGCMDecrypt",  ffi_cryptoAESGCMDecrypt);
    m.set("$crypto_randomKey32", ffi_cryptoRandomKey32);
    m.set("$wasm_load", wasmFFIs.load.bind(wasmFFIs));
    m.set("$wasm_fun", wasmFFIs.fun.bind(wasmFFIs));
    m.set("$wasm_call", wasmFFIs.call.bind(wasmFFIs));
    m.set("$wasm_shutdown", wasmFFIs.shutdown.bind(wasmFFIs));
    m.set("$extra_isFFI", ffi_extra_isFFI);
    m.set("$extra_dispatch", ffi_extra_dispatch);
    m.set("$load_resource", ffi_loadResource);
    // also overridden, but directly in mixrt_runYG (loop.c):
    // - get_env
    // - $string_ofToken
    // - $binary_ofToken
    // - $auth_emptyToken
    // - $crypto_MD5Sum
    return m;
}



;// CONCATENATED MODULE: ./js/worker.js







if (worker_self === undefined) {
    // nodejs needs this
    var worker_self = globalThis
}

let exiting = false;

function w_setup() {
    console.log("GROOVEBOX_BUILD (machine-wasm)", "804");
    if (!isLittleEndian()) {
        // Cannot support big endian because Wasm is little endian, and
        // typed arrays follow the endianness of the system. This would
        // require frequent byte swapping.
        console.error("refusing to start up Mix Machine on a big-endian platform")
        return
    }
    worker_self.onmessage = w_onmessage;
    try {
        if (__webpack_require__.g.process) { // node only
            if (__webpack_require__.g.process.stdout._handle)
                __webpack_require__.g.process.stdout._handle.setBlocking(true);
            if (__webpack_require__.g.process.stderr._handle)
                __webpack_require__.g.process.stderr._handle.setBlocking(true);
        }
    } catch {
    };
    console.log("mix machine: worker started");
}

function isLittleEndian() {
    let x32 = new Uint32Array(1);
    x32[0] = 0x12345678;
    let x8 = new Uint8Array(x32.buffer);
    return x8[0] == 0x78 && x8[1] == 0x56 && x8[2] == 0x34 && x8[3] == 0x12;
}

function w_onmessage(ev) {
    let msg = ev.data;
    switch (msg._rmx_type) {
    case "msg_vm_configure":
        w_on_msg_configure(msg);
        break
    case "msg_vm_logStatus":
        w_logStatus();
        break
    case "msg_vm_logMask":
        w_logMask(msg.mask);
        break
    default:
        console.error("mix machine: unknown message type: " + msg._rmx_type)
    }
}

function w_logMask(m) {
    if (worker_self.state) {
        console.log("mix machine: Setting debug mask to: ", m);
        worker_self.state.config.debugMask = m;
        if (worker_self.state.wasm) {
            worker_self.state.wasm.call(worker_self.state.wasm.instance.exports.mixrt_setDebugFlags, m);
        }
    }
}

function w_on_msg_configure(msg) {
    let config = new Config();
    config.vmID = msg.vmID;
    config.org = msg.org;
    config.workspace = msg.workspace;
    config.baseURL = msg.baseURL;
    config.user = msg.user;
    config.token = msg.token;
    config.debugMask = msg.debugMask;
    config.machType = msg.machType !== undefined ? msg.machType : "WASM";
    config.localFFIs = msg.localFFIs ? msg.localFFIs : {};
    config.allowInsecureHttp = msg.allowInsecureHttp;

    let hub = new globalThis.Channel(msg.hub);
    worker_self.hub = hub
    config.outputViaMQTT = msg.outputViaMQTT;

    let chan_driver = {
        respond: w_respond,
        fficall: w_fficall,
        fficall_local: w_fficall_local,
        output: w_output,
    };
    let chan_async = {
        respond: w_respond,
        fficall: w_fficall,
        fficall_local: w_fficall_local,
        output: w_output,
    };
    let sboard = new Switchboard(config, chan_driver, chan_async);
    let state = new State(config, sboard);
    state.ffiOverride = ffis();  // see ffi.js
    worker_self.state = state;
    w_startup().catch(e => console.log("Error", e))
}

async function w_startup() {
    let config = worker_self.state.config;
    let hub = worker_self.hub;
    let ffiSub = await hub.subscribe(config.topicBase() + "/drvFFIReturn");
    await w_ffiSub(ffiSub);
    let reqSub = await hub.subscribe(config.topicBase() + "/drvRequest");
    await w_reqSub(reqSub);
    let initiateSub = await hub.subscribe(config.topicBase() + "/drvInitiate");
    await w_initiateSub(initiateSub);
    let jinitiateSub = await hub.subscribe(config.topicBase() + "/initiate");
    await w_initiateJSONSub(jinitiateSub);
    if (config.localFFIs) {
        await hub.setLocalPubTopic("/local/ffi/call");
        await hub.setLocalSubTopic("/local/ffi/return");
        let localFfiSub = await hub.subscribe("/local/ffi/return");
        await w_localFfiSub(localFfiSub)
    }
    await w_announce();
}

function w_logStatus() {
    console.log("mix machine: still here")
    // TODO: log more
}

async function w_announce() {
    let config = worker_self.state.config;
    let hub = worker_self.hub;
    let ann_topic = config.topicBase() + "/announce";
    let ann_pay = { _rmx_type:"msg_vm_register", id: config.vmID, variant:config.machType, version: 0 };
    let ann_m = new globalThis.JSONMessage("msg_vm_register", "vm", ann_pay);
    await hub.publish(ann_topic, ann_m, true);
    // CHECK: this permanently consumes a bit of memory in the broker because
    // the "retained" flag is set. Actually this topic can disappear after
    // a short while, as it just exists for synchronization.
}

async function w_reqSub(sub) {
    w_reqSubLoop(sub).catch(e => console.log("Error", e))
    // but don't wait on it
}

async function w_reqSubLoop(sub) {
    while (!exiting) {
        let msg = await sub.next();
        await w_reqMsg(msg);
    }
}

function w_expectsResponse(drvMsg) {
    return drvMsg instanceof DrvSynchronize ||
        drvMsg instanceof DrvToInit ||
        drvMsg instanceof DrvToEnter ||
        drvMsg instanceof DrvWantResult ||
        drvMsg instanceof DrvWantLocation
}

async function w_reqMsg(msg) {
    if (msg.rmxType == "msg_mixDriver") {
        let drvMsg = DrvDecoder(msg, "driver", worker_self.state);
        worker_self.state.sboard.driverRequest(async function(chan) {
            try {
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Driver request", drvMsg);
                if (w_expectsResponse(drvMsg)) worker_self.state.drvCount++;
                worker_self.state.drvRequest = drvMsg;
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            } catch (e) {
                let stack = e.stack || "(no stack trace)";
                console.error("GROOVEBOX EXCEPTION: %s at %s", e.message, stack);
                let r = new DrvError("driver", worker_self.state);
                r.params.setMessage(e.message);
                if (w_expectsResponse(drvMsg)) {
                    chan.respond(r)
                } else {
                    worker_self.state.postponedError = r;
                }
            }
        })
    }
}

async function w_initiateSub(sub) {
    w_initiateSubLoop(sub).catch(e => console.log("Error", e))
    // but don't wait on it
}

async function w_initiateSubLoop(sub) {
    while (!exiting) {
        let msg = await sub.next();
        await w_initiateMsg(msg);
    }
}

async function w_initiateMsg(msg) {
    if (msg.rmxType == "msg_mixDriver") {
        let drvMsg = DrvDecoder(msg, "async", worker_self.state);
        worker_self.state.sboard.asyncRequest(async function(chan) {
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Async request", drvMsg);
            await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
        })
    }
}

async function w_initiateJSONSub(sub) {
    w_initiateJSONSubLoop(sub).catch(e => console.log("Error", e))
    // but don't wait on it
}

async function w_initiateJSONSubLoop(sub) {
    while (!exiting) {
        let msg = await sub.next();
        await w_initiateJSONMsg(msg);
    }
}

function w_registerEchoRequest(chan, j) {
    let echo = j["_rmx_echo"];
    if (j !== undefined && typeof(echo) == "string") {
        worker_self.state.drvEcho.push(echo);
        let timeout = j["timeout"];
        if (typeof(timeout) == "number" && timeout > 0) {
            setTimeout(() => {
                worker_self.state.drvEcho = worker_self.state.drvEcho.filter(e => e != echo);
                let msg =
                    { "_rmx_type": "msg_response",
                      "_rmx_version": "0.0",
                      "_rmx_echo": echo,
                      "session": j.session,
                      "machine": worker_self.state.config.vmID,
                      "org": worker_self.state.config.org,
                      "workspace": worker_self.state.config.workspace,
                      "cellMessages": [],
                      "logMessages": [],
                      "errors": {
                          "code": "",
                          "message": "execution timed out"
                      }
                    };
                chan.output(msg);
            }, timeout * 1000);
        }
    }
}


// The configure message looks like:
// { code: [
//     { code_id: <number>
//       reference: <URL>
//     },
//     ...
//   ],
//   environment: { ... },
//   load: {
//     screen: "name",
//     params: [ ... ]
//   }
// }

async function w_initiateConfigure(msg) {
    let j = msg.payload;
    if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
        console.log("Received message:", j);
    if (typeof(j) !== "object")
        throw new Error("bad msg_vm_configure message");
    let code = j.code;
    if (!Array.isArray(code))
        throw new Error("bad msg_vm_configure message: 'code' not an array");
    let config = j.config;
    let load = j.load;
    let messages = [];
    let create_msg = new DrvCreate("driver", worker_self.state);
    create_msg.params.setInstID(0);
    messages.push(create_msg);
    for (let code_elem of code) {
        let send_msg = new DrvSendCode("driver", worker_self.state);
        let params = send_msg.params;
        let code_id = code_elem.codeID;
        if (typeof(code_id) != "number")
            throw new Error("bad msg_vm_configure message: 'code[].codeID' not a number");
        let code_ref = code_elem.reference;
        if (typeof(code_ref) != "string")
            throw new Error("bad msg_vm_configure message: 'code[].reference' not a string");
        params.setInstID(0);
        params.setCodeID(code_id);
        params.setReference(code_ref);
        messages.push(send_msg);
        let link_msg = new DrvLinkCode("driver", worker_self.state);
        params = link_msg.params;
        params.setInstID(0);
        params.setCodeID(code_id);
        messages.push(link_msg);
    };
    if (config !== undefined) {
        // fixups:
        if (config.standalone)
            config.isMQTTEnabled = false;
        if (config.env !== undefined && config.env.token !== undefined)
            config.env.token = protectedAuthToken(config.env.token);
        let init_msg = new DrvToInit("driver", worker_self.state);
        let params = init_msg.params;
        params.setInstID(0);
        let buf = new Array();
        importRmxCodec(buf, config, newValueDecoder());
        params.setArgs(buf);
        messages.push(init_msg);
    };
    for (let msg of messages) {
        worker_self.state.sboard.enqueue("driver", async function(chan) {
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Driver request from msg_vm_configure", msg);
            await msg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
        })
    };
    if (load !== undefined) {
        if (typeof(load) != "object")
            throw new Error("bad msg_vm_configure message: 'load' not an object");
        let screen = load.screen;
        if (typeof(screen) != "string")
            throw new Error("bad msg_vm_configure message: 'load.screen' not a string");
        let screen_params = load.params;
        if (!Array.isArray(screen_params))
            throw new Error("bad msg_vm_configure message: 'load.params' not an array");
        let msg = new DrvToEnter("driver", worker_self.state);
        let params = msg.params;
        params.setTag("load");
        params.setModname("");
        params.setEntryID(0);
        let buf = new Array();
        importRmxCodec(buf, [ screen, screen_params ], newValueDecoder());
        params.setArgs(buf);
        worker_self.state.sboard.enqueue("driver", async function(chan) {
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Driver request from msg_vm_configure", msg);
            w_registerEchoRequest(chan, j);
            await msg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
        })
    } else {
        let echo = j["_rmx_echo"];
        if (j !== undefined && typeof(echo) == "string") {
            let msg =
                { "_rmx_type": "msg_response",
                  "_rmx_version": "0.0",
                  "session": "",
                  "machine": worker_self.state.config.vmID,
                  "org": worker_self.state.config.org,
                  "workspace": worker_self.state.config.workspace,
                  "cellMessages": [],
                  "logMessages": []
                };
            w_output(msg);
        }
    };
    worker_self.state.sboard.driverRequest(async function(chan) {});
}

async function w_initiateJSONMsg(msg) {
    try {
        switch (msg.rmxType) {
        case "msg_vm_configure":
            await w_initiateConfigure(msg);
            break;
        case "msg_view_poll": {
            // There's no real polling - the main loop runs anyway, and it
            // emits messages as it goes - but we could be interested in
            // adding new echo requests.
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
            });
            break;
        }
        case "msg_view_invoke": {
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            if (typeof(j) !== "object")
                throw new Error("bad msg_view_invoke message");
            let name = j.name;
            if (typeof(name) !== "string")
                throw new Error("bad msg_view_invoke message: name");
            let env = j.env;
            let arg = j.arg;
            if (arg === undefined) arg = null;
            let na = j.nextActions;
            if (na === undefined) na = [];
            if (!Array.isArray(na))
                throw new Error("bad msg_view_invoke message: nextActions");
            let opts = j.options;
            if (opts === undefined) opts = {};
            if (typeof(opts) !== "object")
                throw new Error("bad msg_view_invoke message: options");
            let drvMsg = new DrvToEnter("async", worker_self.state);
            let params = drvMsg.params;
            params.setTag("invoke3");
            params.setModname("");
            params.setEntryID(0);
            let args = [ new ValueOnly(name),
                         new ValueOnly(env),
                         j.argEscEnabled ? arg : new ValueOnly(arg),
                         na,
                         new ValueOnly(opts),
                       ];
            let decoder = newJSONDecoder();
            let buf = new Array();
            importRmxCodec(buf, args, decoder);
            params.setArgs(buf);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Async request", drvMsg);
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            });
            break;
        }
        case "msg_view_input": {
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            if (typeof(j) !== "object")
                throw new Error("bad msg_view_input message");
            let name = j.name;
            if (typeof(name) !== "string")
                throw new Error("bad msg_view_input message: name");
            let value = j.value;
            let drvMsg = new DrvToEnter("async", worker_self.state);
            let params = drvMsg.params;
            params.setTag("input");
            params.setModname("");
            params.setEntryID(0);
            let buf = new Array();
            let decoder = j.valueEscEnabled ? newJSONDecoder() : newValueDecoder();
            importRmxCodec(buf, [new ValueOnly(name), value], decoder);
            params.setArgs(buf);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Async request", drvMsg);
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            });
            break;
        }
        case "msg_view_load": {
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            if (typeof(j) !== "object")
                throw new Error("bad msg_view_load message");
            let module = j.module;
            if (typeof(module) !== "string")
                throw new Error("bad msg_view_load message: module");
            let args = j.args;
            if (args === undefined) args = [];
            if (!Array.isArray(args))
                throw new Error("bad msg_view_load message: args");
            let drvMsg = new DrvToEnter("async", worker_self.state);
            let params = drvMsg.params;
            params.setTag("load");
            params.setModname("");
            params.setEntryID(0);
            let buf = new Array();
            let decoder = j.argsEscEnabled ? newJSONDecoder() : newValueDecoder();
            importRmxCodec(buf, [ new ValueOnly(module), args ], decoder);
            params.setArgs(buf);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Async request", drvMsg);
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            });
            break;
        }
        case "msg_view_push": {
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            if (typeof(j) !== "object")
                throw new Error("bad msg_view_push message");
            let module = j.module;
            if (typeof(module) !== "string")
                throw new Error("bad msg_view_push message: module");
            let args = j.args;
            if (args === undefined) args = [];
            if (!Array.isArray(args))
                throw new Error("bad msg_view_push message: args");
            let drvMsg = new DrvToEnter("async", worker_self.state);
            let params = drvMsg.params;
            params.setTag("push");
            params.setModname("");
            params.setEntryID(0);
            let buf = new Array();
            let decoder = j.argsEscEnabled ? newJSONDecoder() : newValueDecoder();
            importRmxCodec(buf, [ new ValueOnly(module), args ], decoder);
            params.setArgs(buf);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Async request", drvMsg);
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            });
            break;
        }
        case "msg_view_pop": {
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            if (typeof(j) !== "object")
                throw new Error("bad msg_view_pop message");
            let drvMsg = new DrvToEnter("async", worker_self.state);
            let params = drvMsg.params;
            params.setTag("pop");
            params.setModname("");
            params.setEntryID(0);
            let buf = new Array();
            importRmxCodec(buf, [], newValueDecoder());
            params.setArgs(buf);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Async request", drvMsg);
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            });
            break;
        }
        case "msg_view_reset": {
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            if (typeof(j) !== "object")
                throw new Error("bad msg_view_reset message");
            let drvMsg = new DrvToEnter("async", worker_self.state);
            let params = drvMsg.params;
            params.setTag("reset");
            params.setModname("");
            params.setEntryID(0);
            let buf = new Array();
            importRmxCodec(buf, [], newValueDecoder());
            params.setArgs(buf);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Async request", drvMsg);
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            });
            break;
        }
        case "msg_view_refresh": {
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            if (typeof(j) !== "object")
                throw new Error("bad msg_view_refresh message");
            let drvMsg = new DrvToEnter("async", worker_self.state);
            let params = drvMsg.params;
            params.setTag("refresh");
            params.setModname("");
            params.setEntryID(0);
            let buf = new Array();
            importRmxCodec(buf, [], newValueDecoder());
            params.setArgs(buf);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Async request", drvMsg);
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            });
            break;
        }
        case "msg_introspect_spreadsheet": {
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            if (typeof(j) !== "object")
                throw new Error("bad msg_introspect_spreadsheet message");
            let filter = j.filter;
            let drvMsg = new DrvToEnter("async", worker_self.state);
            let params = drvMsg.params;
            params.setTag("spreadsheet_out");
            params.setModname("");
            params.setEntryID(0);
            let buf = new Array();
            importRmxCodec(buf, [filter], newValueDecoder());
            params.setArgs(buf);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Async request", drvMsg);
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            });
            break;
        }
        case "msg_introspect_debug": {
            let j = msg.payload;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Received message:", j);
            if (typeof(j) !== "object")
                throw new Error("bad msg_introspect_debug message");
            let command = j.command;
            let drvMsg = new DrvToEnter("async", worker_self.state);
            let params = drvMsg.params;
            params.setTag("debugCommand_out");
            params.setModname("");
            params.setEntryID(0);
            let buf = new Array();
            importRmxCodec(buf, [command], newValueDecoder());
            params.setArgs(buf);
            worker_self.state.sboard.asyncRequest(async function(chan) {
                w_registerEchoRequest(chan, j);
                if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                    console.log("Async request", drvMsg);
                await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
            });
            break;
        }
        }
    } catch (e) {
        console.error(e)
    }
}

async function w_ffiSub(sub) {
    w_ffiSubLoop(sub).catch(e => console.log("Error", e))
    // but don't wait on it
}

async function w_ffiSubLoop(sub) {
    while (!exiting) {
        let msg = await sub.next();
        await w_ffiMsg(msg);
    }
}

async function w_ffiMsg(msg) {
    if (msg.rmxType == "msg_mixFFI") {
        let drvMsg = DrvDecoder(msg, "FFI", worker_self.state);
        let coroutine = drvMsg.params.getCoroutine();
        worker_self.state.sboard.FFIReturn(coroutine, async function(chan) {
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("FFI return", drvMsg);
            await drvMsg.exec(chan, worker_self.state.drvSerial, worker_self.state.ffiOverride);
        })
    }
}

async function w_localFfiSub(sub) {
    w_localFfiSubLoop(sub).catch(e => console.log("Error", e))
    // but don't wait on it
}

async function w_localFfiSubLoop(sub) {
    while (!exiting) {
        let msg = await sub.next();
        await w_localFfiMsg(msg);
    }
}

async function w_localFfiMsg(msg) {
    let coroutine = msg.payload.call_id;
    let instID = 0;  // unused so far
    switch (msg.rmxType) {
    case "msg_ffi_return":
        worker_self.state.sboard.FFIReturn(coroutine, async function(chan) {
            let drvMsg = new DrvMessage("local", "FFI", worker_self.state);
            drvMsg.ffireturn(coroutine, msg.payload.value, newClonableDecoder());
            await drvMsg.run(instID, chan, worker_self.state.drvSerial, worker_self.state.ffiOverride)
        });
        break;
    case "msg_ffi_error":
        worker_self.state.sboard.FFIReturn(coroutine, async function(chan) {
            let drvMsg = new DrvMessage("local", "FFI", worker_self.state);
            let error =
                { message: msg.payload.message,
                  stack: msg.payload.stack
                };
            drvMsg.ffiabort(coroutine, error);
            await drvMsg.run(instID, chan, worker_self.state.drvSerial, worker_self.state.ffiOverride)
        });
        break;
    case "msg_ffi_later":
        worker_self.state.sboard.FFIReturn(coroutine, async function(chan) {
            let wasm = worker_self.state.wasm;
            let mixrt = wasm.instance.exports;
            wasm.call(mixrt.mixrt_reqRunning);
            let drvMsg = new DrvMessage("local", "FFI", worker_self.state);
            await drvMsg.run(instID, chan, worker_self.state.drvSerial, worker_self.state.ffiOverride)
        });
        break;
    default:
        console.log("unexpected rmxType on /local/ffi/return: " + msg.rmxType)
    }
}

async function w_respond(drvRetMsg) {
    let config = worker_self.state.config;
    let hub = worker_self.hub;
    let resp_topic = config.topicBase() + "/drvResponse";
    let status_topic = config.topicBase() + "/drvStatus";
    let responded = false;
    if (worker_self.state.drvCount > 0 && drvRetMsg.queue == "driver") {
        // amp expects a response. We suppress DrvToIdle messages as synch
        // responses.
        if (!(drvRetMsg instanceof DrvToIdle)) {
            worker_self.state.drvCount--;
            if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
                console.log("Driver response", drvRetMsg);
            let retMsg = drvRetMsg.encode("msg_mixDriver");
            await hub.publish(resp_topic, retMsg, false);
            responded = true;
        }
    };
    if (!responded) {
        // amp does not expect a response
        if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
            console.log("Async status", drvRetMsg);
        let retMsg = drvRetMsg.encode("msg_mixDriver");
        await hub.publish(status_topic, retMsg, false);
    };
    let is_done = worker_self.state.sboard.done();
}

async function w_fficall(drvRetMsg) {
    if (!drvRetMsg instanceof DrvToFFICall) {
        throw new Error("trying to send the wrong message on drvFFICall topic");
    };
    let config = worker_self.state.config;
    let hub = worker_self.hub;
    worker_self.state.sboard.FFICall(drvRetMsg.params.getCoroutine());
    let resp_topic = config.topicBase() + "/drvFFICall";
    if (worker_self.state.config.debugMask & debugFlags.DEBUG_MESSAGES)
        console.log("FFI call", drvRetMsg);
    let retMsg = drvRetMsg.encode("msg_mixFFI");
    await hub.publish(resp_topic, retMsg, false);
}

async function w_fficall_local(name, coroutine, args) {
    worker_self.state.sboard.FFICall(coroutine);
    let hub = worker_self.hub;
    let payload =
        { name: name,
          call_id: coroutine,
          args: args
        };
    let msg = hub.newLocalMessage("msg_ffi_call", "vm", payload);
    await hub.publish("/local/ffi/call", msg, false);
}

async function w_output(outMsg) {
    let config = worker_self.state.config;
    let hub = worker_self.hub;
    let out_topic = config.topicBase() + "/output";
    let msg = new globalThis.JSONMessage("msg_response", "vm", outMsg);
    await hub.publish(out_topic, msg, false);
}

w_setup();

;// CONCATENATED MODULE: ./js/index.js
// entry for the browser


globalThis.Channel = Channel
globalThis.JSONMessage = JSONMessage
globalThis.BinaryMessage = BinaryMessage
globalThis.TextMessage = TextMessage
globalThis.EOF = EOF

globalThis.mixrt_code = null;



/******/ })()
;