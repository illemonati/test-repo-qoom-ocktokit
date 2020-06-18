var slideIndex = 0;

function showSlides() {
	var i;
	let slides = document.querySelectorAll('.header-slides');
	for (i = 0; i < slides.length; i++) {
		slides[i].style.display = 'none';
	}
	slideIndex ++ ;
	if (slideIndex > slides.length) {slideIndex = 1}
	slides[slideIndex - 1].style.display = 'block';
	setTimeout(showSlides, 6000);
}

function openTrialer(){
	let adjectives = ["busy", "nimble", "brave"
				, "mighty", "clever", "dull"
				, "proud", "fair", "wise", "tricky", "truthful", "loyal"
				, "happy", "cheerful", "joyful", "friendly"
				, "excited", "calm", "hardworking", "silly"
				, "wild", "starving", "stuffed", "alert", "sleepy", "surprised"
				, "strict", "tough", "polite", "amusing", "kind"
				, "gentle", "quiet", "caring", "hopeful", "generous"
				, "quick", "speedy", "swift", "rapid", "good", "fantastic", "splendid", "wonderful"
				, "challenging", "easy", "simple", "chilly", "freezing", "icy", "steaming", "sizzling", "cozy", "huge", "great"
				, "vast", "sturdy", "grand", "heavy", "plump", "deep", "puny", "small", "tiny", "petite", "long", "endless", "beautiful"
				, "adorable", "shining", "sparkling", "glowing", "soaring", "crawling"
				, "slimy", "grimy", "crispy", "spiky", "rusty", "curly", "fuzzy"
				, "plush", "wrinkly", "smooth", "glassy", "snug", "stiff"
				, "loud", "shrill"
				];
	let nouns = [ "airplane", "airport", "animals", "apple", "ants"
			, "bag", "bakery", "ball", "balloon", "banana", "bee", "bench", "bike", "bison"
			, "calf", "camel", "canal", "car", "carrot", "castle", "cat", "cheetah", "cherry"
			, "dog", "dolphin", "donkey", "dragonfly", "duck"
			, "eagle", "elephant"
			, "fall", "fish", "firemen", "flippers", "fog", "fox", "frog", "fruit"
			, "garage", "garden", "gate", "goat", "gold", "goose", "gorilla", "grapes", "grass", "guitar"
			, "hammer", "harbor", "hat", "heart", "hen", "hippo", "horse"
			, "iceberg", "icecream", "jeans", "juice", "kettle", "kitten", "kiwi"
			, "ladybug", "lamb", "lake", "lime", "lizard"
			, "monkey", "moon", "moth", "mushroom", "music"
			, "newspapers", "night"
			, "orange", "onion", "octopus", "owl", "oven"
			, "paint", "pancake", "panda", "parrot", "peach", "pear", "penguin", "pepper", "piano", "pig", "piglet", "pineapple", "pizza", "pony", "puppet"
			, "quilt"
			, "rabbit", "radio", "rainbow", "recorder", "rhino", "rice", "river", "robot", "rose", "rug"
			, "salad", "saw", "scooter", "sea", "shark", "sheep", "shovel", "sky", "snake", "snow"
			, "space", "sphere", "stars", "spring", "spider", "sun", "swan"
			, "tacos", "teddy", "tiger", "tomato", "tortoise", "tractor", "train", "tree", "trombone", "truck"
			, "umbrella"
			, "violin"
			, "whale", "wolf", "window", "worm"
			, "yellow", "yak", "yoyo"
			, "zebra"
			];
	let createdRandomSubdomain = '';
			
	function getRandomInt(max) {
		return Math.floor(Math.random() * Math.floor(max));
	}
	
	function getRandomWord(wordsArray) {
	    var index = Math.floor( Math.random() * wordsArray.length );
	    return wordsArray[index];
	}
	
	function createNewWord() {
	    var newWordPart1 = getRandomWord(adjectives);
	    var newWordPart2 = getRandomWord(nouns);
		var newNumber = getRandomInt(100);
	    
	    while (newWordPart1.length + newWordPart2.length > 8) {
	    	newWordPart1 = getRandomWord(adjectives);
	    	newWordPart2 = getRandomWord(nouns);
	    }
		
		createdRandomSubdomain = newWordPart1 + newWordPart2 + newNumber;
	    
	    return createdRandomSubdomain;
	}
	
	createNewWord();
	window.open(`https://${createdRandomSubdomain}.qoom.space/edit/index.html`, '_blank');
}

showSlides();