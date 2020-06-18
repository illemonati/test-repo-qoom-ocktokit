var menuIcon = document.querySelector('.menuIcon');
var navBackground = document.querySelector('.navBackground');
var navMenuContent = document.querySelector('.navMenuContent');

if(!!menuIcon) menuIcon.addEventListener('click', function(e) {
	navMenuContent.classList.toggle('open');
	navBackground.style.display = 'block';
});
if(!!navBackground) navBackground.addEventListener('click', function(e) {
	navMenuContent.classList.remove('open');
	navBackground.style.display = 'none';
});