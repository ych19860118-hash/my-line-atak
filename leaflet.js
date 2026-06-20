// Leaflet 1.9.4 JS 本地安全加載（改用不擋 CORS 的 cdnjs 通道）
(function() {
    if (window.L) return;
    
    // 自動向遠端載入最寬容的 Cloudflare 資源，破除 openstreetmap 的跨網域攔截
    var script = document.createElement('script');
    script.src = 'https://cloudflare.com';
    script.crossOrigin = 'anonymous'; // 強制開啟跨網域匿名允許
    document.head.appendChild(script);
})();
