/**
 * VideoMonitor 视频播放监听器
 * 此监听器主要用来对于video标签进行事件监听代理，通过对外提供的handler插件注册机制将这些事件转发给handler们
 * handler只要具备相应的与事件同名方法即可，比如具有play timeupdate ended error .....方法
 * 同样，此监听器内部还封装了三种事件便于handler处理，如下：
 * 对外handler提供 事件
 *                     count  视频播放计时器，每秒通知一次，暂停或拖拽时会暂停计时，便于外部handler进行视频观看时长的上报；
 *                     buffer 自然缓冲通知，由于网络问题造成的自然卡顿结束
 *                     drag   用户拖拽通知，由于用户拖拽造成的卡顿结束
 * @author yanglang
 */
honey.def('lib_debug',H => {

    var __EVENTS = ['play','timeupdate','ended','error','loadstart','loadedmetadata','playing','pause','seeking','seeked','waiting'];

    var VideoMonitor = function() {
        throw new TypeError('请使用monitor方法进行监测');
    };

    var seekingStart = 0;

    window.onerror = function(msg){
        H._debug.error(msg);
    }

    VideoMonitor.prototype = {
        constructor: VideoMonitor,
        /**
         * 构造方法
         * @param videoDom video dom对象
         */
        init:function(videoDom, videoInfo){
            H._debug.log('初始化视频监听');
            this.videoDom = videoDom;
            this.videoInfo = videoInfo;
            this.lastTimeupdate = 0;
            this.seekTime = -1;
            this.suuid = STK.$.getsUUID();
            this.firstBuffer = true;
            this.seekTimeout = null;
            this.bindContext();
            this.bindEvents();
        },
        /**
         * @method {{destroy}} 销毁监听
         * @return {[type]} [description]
         */
        destroy:function(){
            H._debug.log('销毁视频监听');
            this.unbindEvents();
            setTimeout(()=>{
                this.videoDom = null;
                this.videoInfo = null;
            });
        },
        /**
         * @method {{bind}} 替换上下文
         * @param  {Function} fn  [description]
         * @param  {[type]}   ctx [description]
         * @return {[type]}       [description]
         */
        bind:function(fn, ctx) {
          return function (a) {
            var l = arguments.length;
            return l ? l > 1 ? fn.apply(ctx, arguments) : fn.call(ctx, a) : fn.call(ctx);
          };
        },
        /**
         * @method {{bindContext}} 绑定上下文
         */
        bindContext:function(){
            this.onEventHandler = this.bind(this.onEventHandler,this);
        },
        /**
         * @method {{bindEvents}} 绑定视频对象回调事件
         */
        bindEvents:function(){
            let playerDom = this.videoDom;
            for(var event in __EVENTS){
                playerDom.addEventListener(__EVENTS[event], this.onEventHandler, false);
            }
        },
        /**
         * @method {{unbindEvents}} 解绑视频对象回调事件
         */
        unbindEvents:function(){
            let playerDom = this.videoDom;
            for(var event in __EVENTS){
                playerDom.removeEventListener(__EVENTS[event], this.onEventHandler, false);
            }
        },
        /**
         * @method {{onEventHandler}} video事件handler
         * @param  {[type]} e [description] 事件对象
         */
        onEventHandler:function(e){
            //触发自身回调事件
            if(this[e.type] && typeof this[e.type] === 'function'){
                this[e.type].call(this,e);
            }
            //触发外部注册的句柄回调
            this.fireHandler(e);
        },
        /**
         * @method {{fireHandler}} 通知回调句柄进行处理
         * @param  {[type]} e    [description] 事件对象
         * @param  {[type]} data [description] 自定义数据
         */
        fireHandler:function(e,data){
            for(var i = 0,len = handlerArray.length;i<len;i++){
                if(handlerArray[i][e.type] && typeof handlerArray[i][e.type] === 'function'){
                    handlerArray[i][e.type](e,$.extend(this.videoInfo,data,{suuid:this.suuid}));
                }
           }
        },
        play:function(e){
            this.lastTimeupdate = +new Date();
            this.startHeartBeatCount();
        },

        playing(){
            this.lastTimeupdate = +new Date();
        },

        pause:function(){
            this.lastTimeupdate = +new Date();
            this.stopHeartBeatCount();
        },

        seeking(e){
            this.lastTimeupdate = +new Date();

            if (seekingStart == 0) {
                seekingStart = this.lastTimeupdate;
            }

            if (this.seekTime == -1 && e.target.currentTime != 0) {
                this.seekTime = e.target.currentTime;
            }
        },

        seeked(e){
            var self = this;
            var player = e.target;
            var td = 0;
            if (seekingStart > 0) {
                td = new Date().getTime() - seekingStart;
            }
            // 拖拽结束后上报drag时间
            this.lastTimeupdate = +new Date();
            if (player.currentTime != 0 && player.currentTime != this.videoInfo.info.duration && seekingStart > 0) {
                if (this.seekTimeout) {
                    clearTimeout(this.seekTimeout);
                    this.seekTimeout = null;
                }
                
                this.seekTimeout = setTimeout(
                    e => {
                        self.fireHandler({type:'drag',target:self.videoDom});
                        this.seekTime = -1;
                        seekingStart = 0; // 只有上报了才置0
                    }, 
                    1000
                );
            }   
        },

        timeupdate(e){
            var self = this;
            // 获取两次timeupdate事件间隔，用于卡顿判断
            var now = +new Date();
            if (this.lastTimeupdate !== 0) {
                var d = now - this.lastTimeupdate;
                // 时间间隔超过1s,认为是在缓冲中
                if (d >= 1000) {
                    H._debug.log('自然缓冲上报');
                    self.fireHandler({type:'buffer',target:self.videoDom},{firstBuffer:self.firstBuffer});
                    self.firstBuffer = false;//第一次缓冲已经发生过了
                }
            }
            this.lastTimeupdate = now;
        },

        //收集观看时长并每秒通知一次
        currentCount:0,
        timer:null,
        startHeartBeatCount:function(){
            var self = this;
            self.timer = setTimeout(function(){
                self.currentCount++;
                self.fireHandler({type:'count',target:self.videoDom},{count:self.currentCount});
                    self.startHeartBeatCount();
            },1000);
        },
        stopHeartBeatCount:function(){
            clearTimeout(this.timer);
            this.timer = null;
        }
    };

    VideoMonitor.prototype.init.prototype = VideoMonitor.prototype;

    var MonitorArray = [], handlerArray = [];

    /**
     * 开始监测
     * @param videoDom video dom对象
     */
    VideoMonitor.monitor = function(videoDom, videoInfo ) {
        var monitor = new VideoMonitor.prototype.init(videoDom,videoInfo);
        MonitorArray.push({
            dom:videoDom,
            instance:monitor
        });
        return monitor;
    };

    /**
     * 注册回调处理句柄
     * @param handler对象
     */
    VideoMonitor.listen = function(handler) {
        handlerArray.push(handler);
    };

    /**
     * 停止监测
     * @param videoDom video dom对象
     */
    VideoMonitor.destroy = function(videoDom) {
        // find instance
        var monitor = findInstance(videoDom);
        removeInstance(videoDom);
        monitor && monitor.destroy();
    };

    /**
     * @method {{findInstance}} 查找监听句柄
     * @param  {[type]} video dom对象
     * @return {[type]}        [description]
     */
    function findInstance(videoDom){
        for(var index in MonitorArray){
            if(MonitorArray[index].dom === videoDom)
                return MonitorArray[index].instance;
        }
        return null;
    }

    /**
     * @method {{removeInstance}} 删除监听句柄
     * @param  {[type]} video dom对象
     * @return {[type]}        [description]
     */
    function removeInstance(videoDom){
        for(var index in MonitorArray){
            if(MonitorArray[index].dom === videoDom)
                MonitorArray.splice(index,1);
        }
    }

    H.VideoMonitor = VideoMonitor;
});
