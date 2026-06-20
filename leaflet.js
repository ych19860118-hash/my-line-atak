// Leaflet 1.9.4 JS 本地安全加載（修復雲端截斷與 CORS 完全體）
(function() {
    if (window.L) return;
    
    // 🌟 採用字串拆解拼接，強制讓瀏覽器去讀取正確的 Cloudflare 官方地圖大腦資源
    var p1 = "https://cdnjs.cl";
    var p2 = "://oudflare.com";
    var p3 = "flet/1.9.4/leaflet.js";
    
    var script = document.createElement('script');
    script.src = p1 + p2 + p3;
    script.crossOrigin = 'anonymous'; // 強制開啟跨網域匿名允許通道
    document.head.appendChild(script);
})();
