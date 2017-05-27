/**
 * admonitor 广告播放检监测上报
 * @author yanglang
 */
var AdMonitor = function() {
    throw new TypeError('请使用monitor方法进行监测');
};

AdMonitor.prototype = {
    constructor: AdMonitor,
    /**
     * 构造方法
     * @param videoDom video dom对象
     * @param player   video-player播放器实例
     */
    init: function(videoDom , player) {
        //console.log('初始化广告监听');
        this.videoDom = videoDom;
        this.player   = player;
        this.status   = {};
        this.bindContext();
        this.bindEvents();
    },
    /**
     * @method {{destory}} 销毁监听
     * @return {[type]} [description]
     */
    destory:function(){
        //console.log('销毁广告监听');
        this.unbindEvents();
        setTimeout(()=>{
            this.player   = null;
            this.videoDom = null;
        });
        this.status = {};
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
    bindContext:function(){
        this.onPlayHandler = this.bind(this.onPlayHandler,this);
        this.onTimeUpdateHandler = this.bind(this.onTimeUpdateHandler,this);
        this.onEndedHanlder = this.bind(this.onEndedHanlder,this);
        this.onErrorHandler = this.bind(this.onErrorHandler,this);
    },
    bindEvents:function(){
        let playerDom = this.videoDom;
        // 可以播放视频
        playerDom.addEventListener('play', this.onPlayHandler, false);

        // 时间更新
        playerDom.addEventListener('timeupdate', this.onTimeUpdateHandler, false);

        // 结束
        playerDom.addEventListener('ended', this.onEndedHanlder, false);

        // 错误处理
        playerDom.addEventListener('error', this.onErrorHandler, false);

    },
    unbindEvents:function(){
        let playerDom = this.videoDom;
        // 可以播放视频
        playerDom.removeEventListener('play', this.onPlayHandler, false);

        // 时间更新
        playerDom.removeEventListener('timeupdate', this.onTimeUpdateHandler, false);

        // 结束
        playerDom.removeEventListener('ended', this.onEndedHanlder, false);

        // 错误处理
        playerDom.removeEventListener('error', this.onErrorHandler, false);
    },
    onPlayHandler:function(){
        let player = this.player, playerDom = this.videoDom;
        if(player && !player.isVideo()){
            if (!player.current.hasPlayed && player.current.start && !this.status['start']) {
                //console.log('广告start 上报：'+player.current.start)
                let error = player.current.error.replace('[ERRORCODE]', '700')
                    .replace('[ERRORMSG]', '');

                Stat.adlog(player.current.start, error);
                this.status['start'] = true;
                player.current.hasPlayed = true;
            }
        }
    },
    onTimeUpdateHandler:function(){
        let player = this.player, playerDom = this.videoDom;
        if(player && !player.isVideo()){
            //检测1/4节点
            if (player.current.hasPlayed && player.current.firstQuartile && !this.status['firstQuartile']) {
                if(playerDom.currentTime/playerDom.duration > .25) {
                    //console.log('广告firstQuartile 上报：'+player.current.firstQuartile)
                    let error = player.current.error.replace('[ERRORCODE]', '700')
                        .replace('[ERRORMSG]', '');

                    Stat.adlog(player.current.firstQuartile, error);
                    this.status['firstQuartile'] = true;
                }
            }
            //检测1/2节点
            if (player.current.hasPlayed && player.current.midpoint && !this.status['midpoint']) {
                if(playerDom.currentTime/playerDom.duration > .5) {
                    //console.log('midpoint 上报：'+player.current.midpoint)
                    let error = player.current.error.replace('[ERRORCODE]', '700')
                        .replace('[ERRORMSG]', '');

                    Stat.adlog(player.current.midpoint, error);
                    this.status['midpoint'] = true;
                }
            }
            //检测3/4节点
            if (player.current.hasPlayed && player.current.thirdQuartile && !this.status['thirdQuartile']) {
                if(playerDom.currentTime/playerDom.duration > .75) {
                    //console.log('thirdQuartile 上报：'+player.current.thirdQuartile)
                    let error = player.current.error.replace('[ERRORCODE]', '700')
                        .replace('[ERRORMSG]', '');

                    Stat.adlog(player.current.thirdQuartile, error);
                    this.status['thirdQuartile'] = true;
                }
            }
        }
    },
    onEndedHanlder:function(){
        let player = this.player, playerDom = this.videoDom;
        if(player && player.current.complete && !this.player.isVideo()){
            //console.log('complete 上报：'+this.player.current.complete)
            let error = this.player.current.error.replace('[ERRORCODE]', '700')
                    .replace('[ERRORMSG]', '');

            Stat.adlog(this.player.current.complete, error);
            this.status = {};
        }
    },
    onErrorHandler:function(){
        let player = this.player, playerDom = this.videoDom;
        if(player && !this.player.isVideo()){
            let error = this.player.current.error.replace('[ERRORCODE]', '400')
                        .replace('[ERRORMSG]', '')
                        .replace('[ERRORURL]', encodeURIComponent(this.player.current.source));

            Stat.adlog([error]);
        }
    }
};

AdMonitor.prototype.init.prototype = AdMonitor.prototype;

var MonitorArray = [];

/**
 * 开始监测
 * @param videoDom video dom对象
 * @param player   video-player播放器实例
 */
AdMonitor.monitor = function(videoDom , player) {
    var monitor = new AdMonitor.prototype.init(videoDom , player);
    MonitorArray.push({
        dom:videoDom,
        player:player,
        instance:monitor
    });
    return monitor;
};

/**
 * 停止监测
 * @param player   video-player播放器实例
 */
AdMonitor.destory = function(player) {
    // find instance
    var monitor = findInstance(player);
    monitor && monitor.destory();
};

/**
 * @method {{findInstance}} 查找监听句柄
 * @param  {[type]} player [description]
 * @return {[type]}        [description]
 */
function findInstance(player){
    for(var index in MonitorArray){
        if(MonitorArray[index].player === player)
            return MonitorArray[index].instance;
    }
    return null;
}

export default AdMonitor;