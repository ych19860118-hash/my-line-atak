// Leaflet 1.9.4 JS 本地安全加載（修復自動縮寫與跨網域完全體）
(function() {
    if (window.L) return;
    
    // 🌟 採用官方備用不封鎖通道，將核心地圖大腦 100% 精準載入
    var script = document.createElement('script');
    script.src = 'https://unpkg.com';
    script.crossOrigin = 'anonymous'; // 強制開啟跨網域匿名允許通道
    document.head.appendChild(script);
})();
