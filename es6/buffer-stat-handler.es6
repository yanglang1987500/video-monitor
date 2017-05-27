/**
 * BufferStat Buffer缓冲上报handler，handler，由VideoMonitor统一进行事件通知，每秒一次，此模块只专注于上报心跳
 * 视频缓冲结束时上报
 * @author yanglang
 */
honey.def('es6_video-monitor',H => {

    var aver = 'imgotv-ipad-5.0',
        pver = 'imgotv-player-1.0',
        version = navigator.userAgent.toLowerCase().match(/cpu os ([0-9_]+)/),
        version = version ? version[1]: '',
        sver = 'ipad-' + version.replace(/_/g, '.'),
        url = 'http://padweb.v0.mgtv.com/buffer.php', 
        idx = 0, 
        stk = new STK.start();

	var isPad = /(iPad|Android)/.test(navigator.userAgent);
	var V = window.VIDEOINFO;
	var base = {
		act:'buffer',
		cf: '', //cf 正片与否
        vts: '',
        pt:V.pt, //播放视频种类
		vid:V.vid || '', //vid
		plid:V.cid || '', //plid
		pver:pver,
		cid:V.rid || '', //cid
		def: 1,//pad默认标清
		pay: '',
		istry:0,//pad没有试看
		idx:0,
		bdid:window.PLAYLIST_INFO ? window.PLAYLIST_INFO.id : '',
		ap:0,
		ch:STK.$.getRequest('cxid'),
		ct:'',
		td:'',
		suuid:'',
		bsid:V.sid || '',
		cpn:V.cpn
	};
	
	class BufferStatHandler{
		constructor(){
			this.timer = null;
		}
		
		/**
		 * @method {{buffer}} 自然缓冲（有时候也包括用户拖拽产生的缓冲，所以需要特殊处理）
		 * @param  {[type]} e         [事件对象]
		 * @param  {[type]} videoInfo [正片信息]
		 * @return {[type]}           [description]
		 */
		buffer(e,videoInfo){
        	H._debug.log('BufferStatHandler准备。。。自然缓冲上报？。。。');
			var self = this;
			var data = $.extend(base,{
                cf:videoInfo.info.clip_type,
                vts:videoInfo.info.duration,
                pay:videoInfo.info.paymark,
                ct:e.target.currentTime,
                suuid:videoInfo.suuid,
                bftype:videoInfo.firstBuffer?'1':'2'
            });
            //暂缓2秒后上报，以判断是否是拖拽导致的缓冲(第一次缓冲上报除外)
			this.timer = setTimeout(function(){
            	H._debug.log('BufferStatHandler自然缓冲上报！。。。'+videoInfo.firstBuffer);
				self.timer = null;
				data.idx = ++idx;
            	stk.create(data,url);
			},videoInfo.firstBuffer?0:2000);
		}

		/**
		 * @method {{drag}} 用户拖拽结束通知
		 * @param  {[type]} e         [事件对象]
		 * @param  {[type]} videoInfo [正片信息]
		 * @return {[type]}           [description]
		 */
		drag(e,videoInfo){
            H._debug.log('BufferStatHandler准备拖拽上报？。。。');
            if(this.timer){
            	H._debug.log('BufferStatHandler清空自然缓冲上报定时器。。。');
            	clearTimeout(this.timer);
            	this.timer = null;
            }
            H._debug.log('BufferStatHandler拖拽上报！。。。');
			var data = $.extend(base,{
                cf:videoInfo.info.clip_type,
                vts:videoInfo.info.duration,
                pay:videoInfo.info.paymark,
                ct:e.target.currentTime,
                suuid:videoInfo.suuid,
                bftype:'3',
                idx:++idx
            });
            stk.create(data,url);
		}
	}

	//调用VideoMonitor的listen方法进行handler监听注册
	H.VideoMonitor.listen(new BufferStatHandler());
});