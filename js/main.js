$(document).ready(function(){
    // 위로가기
    var speed = 500;
    $(".gotop").css("cursor", "pointer").click(function()
    {$('body, html').animate({scrollTop:0}, speed);});
});
