// Leaflet 1.9.4 JS 本地安全加載（完全體前端大腦）
(function() {
    if (window.L) return;
    
    // 自動向官方備用不封鎖通道載入核心地圖控制腳本
    var script = document.createElement('script');
    script.src = 'https://unpkg.com';
    script.crossOrigin = 'anonymous'; // 強制開啟跨網域匿名允許通道
    document.head.appendChild(script);
})();
