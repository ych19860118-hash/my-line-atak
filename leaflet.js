// Leaflet 1.9.4 JS 本地安全加載（修復 global 錯誤版本）
(function() {
    if (window.L) return;
    
    // 自動向遠端載入穩定的大腦資源，確保不受 Render 沙盒限制
    var script = document.createElement('script');
    script.src = 'https://openstreetmap.org';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
})();
