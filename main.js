// تحديد العناصر في الصفحة
const searchBox = document.querySelector('.search input');
const searchBtn = document.querySelector('.search button');
const weatherIcon = document.querySelector(".weather-icon");
const weather = document.querySelector('.weather');
const errorElement = document.querySelector(".error");
const useCurrentLocation = document.getElementById("useCurrentLocation");
const instructions = document.querySelector('.instructions');
const lottie = document.querySelector(".lottie");
const autocompleteList = document.getElementById("autocomplete-list");
const apiKey = "29d595a6c51d25434b83746e197e0736";

// إخفاء عنصر الخطأ في البداية
errorElement.style.display = "none";

// دالة التحقق من الموقع الحالي
function checkCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, geolocationError);
    } else {
        console.log("Geolocation is not supported by this browser.");
    }
}

// إعداد مفتاح Mapbox
mapboxgl.accessToken = "pk.eyJ1IjoibW9zdGFmYW1vaGFtZWQ4NiIsImEiOiJjbTJ2eWd0aDMwMWNjMmlxdWEwaWhsb2MzIn0.ITibgyaf2jr-1LvS9V-8vQ";

// دالة النجاح للحصول على الإحداثيات
function success(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    checkWeatherByCoordinates(latitude, longitude);
    initMap(latitude, longitude); // تمرير الإحداثيات إلى دالة initMap
}

// دالة الخطأ في حال عدم الحصول على الموقع
function geolocationError() {
    console.log("Unable to retrieve your location.");
}

// دالة إظهار الخطأ
function showError() {
    document.querySelector("lottie-player").stop();
    lottie.style.display = "none";
    errorElement.style.display = "block";
    weather.style.display = "none";
    searchBtn.disabled = false;
}

// دالة جلب بيانات الطقس باستخدام الإحداثيات
async function checkWeatherByCoordinates(lat, lon) {
    const apiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&";
    const url = `${apiUrl}lat=${lat}&lon=${lon}&appid=${apiKey}`;

    try {
        const response = await fetch(url);
        if (response.status === 404) {
            showError();
        } else {
            const data = await response.json();
            displayWeather(data);
            initMap(lat, lon); // تحديث الخريطة مع الإحداثيات الجديدة
        }
    } catch (error) {
        showError();
        console.error("Error fetching weather data:", error);
    }
}

// حدث عند كتابة المستخدم في صندوق البحث

let debounceTimer;
searchBox.addEventListener("input", async function() { 
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(()=>{
        const query = searchBox.value.trim();
    if (query) { // لو فيه نص مكتوب
        getCitySuggestions(query);
        instructions.style.display = "none";
        autocompleteList.style.display = "block";
    } else {
        autocompleteList.innerHTML = "";
        instructions.style.display = "block";
        autocompleteList.style.display = "none";
    }
    }, 500);
});

// دالة جلب اقتراحات المدن
let suggestionCache = {}; // cache لتخزين الاقتراحات
let controller;
async function getCitySuggestions(query) {
    if(suggestionCache[query]){
        displaySuggestions(suggestionCache[query]);
        return;
    }
    if(controller){
        controller.abort(); // الغاء الطلب السابق
    }
    controller = new AbortController();
    const signal = controller.signal;

    const apiUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=3&appid=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {signal});
        const data = await response.json();
        
        const validSuggestions = [];
        for(const suggestion of data){
            const city = suggestion.name;
            const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;

            const weatherResponse = await fetch(weatherApiUrl);
            if(weatherResponse.ok)
                validSuggestions.push(suggestion);
        }
        suggestionCache[query] = validSuggestions; // تخزين الاقتراحات فى الكاش
        // عرض الاقتراحات الصحيحة فقط
        displaySuggestions(validSuggestions);
    } catch (error) {
        if(error.name == 'AbortError'){
            console.log('Request canceled');
        }else
        console.error("Error fetching city suggestions", error);
    }
}

// دالة عرض الاقتراحات
function displaySuggestions(suggestions) {
    autocompleteList.innerHTML = "";

    const uniqueSuggestions = new Set();

    suggestions.forEach(suggestion => {
        const suggestionText = `${suggestion.name}, ${suggestion.country}`;
        if (!uniqueSuggestions.has(suggestionText)) {
            uniqueSuggestions.add(suggestionText);

            const suggestionItem = document.createElement("div");
            suggestionItem.innerHTML = suggestionText; // عرض المدن المقترحة
            suggestionItem.classList.add("autocomplete-item");

            // حدث عند اختيار المدينة
            suggestionItem.addEventListener("click", function() {
                searchBox.value = suggestion.name; // تحديث صندوق البحث
                autocompleteList.innerHTML = ""; // إخفاء الاقتراحات بعد الاختيار
                checkWeather(suggestion.name);
            });
            autocompleteList.appendChild(suggestionItem);
        }
    });
}

// دالة عرض بيانات الطقس
function displayWeather(data) {
    document.querySelector("lottie-player").stop();
    lottie.style.display = "none";
    document.querySelector(".city").innerHTML = data.name;
    document.querySelector(".temp").innerHTML = Math.round(data.main.temp) + "°C";
    document.querySelector(".humidity").innerHTML = data.main.humidity + "%";
    document.querySelector(".wind").innerHTML = data.wind.speed + " km/h";

    // تحديث الأيقونة بناءً على حالة الطقس
    switch (data.weather[0].main) {
        case "Clouds":
            weatherIcon.src = "images/clouds.png";
            break;
        case "Clear":
            weatherIcon.src = "images/clear.png";
            break;
        case "Rain":
            weatherIcon.src = "images/rain.png";
            break;
        case "Drizzle":
            weatherIcon.src = "images/drizzle.png";
            break;
        case "Mist":
            weatherIcon.src = "images/mist.png";
            break;
        default:
            weatherIcon.src = "images/snow.png";
    }

    weather.style.display = "block";
    errorElement.style.display = "none";
}

// دالة تهيئة الخريطة باستخدام Mapbox
function initMap(lat, lon) {
    const location = [lon, lat]; // تحديد الموقع

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: location,
        zoom: 13
    });

    const marker = new mapboxgl.Marker({
        draggable: true,
    })
    .setLngLat(location)
    .addTo(map);

    marker.on('dragend', function() {
        const newCoords = marker.getLngLat();
        checkWeatherByCoordinates(newCoords.lat, newCoords.lng);
    });
}

// إضافة حدث عند النقر على زر البحث
searchBtn.addEventListener("click", () => {
    const city = searchBox.value.trim();
    
    if (city) {
        checkWeather(city);
        searchBtn.disabled = true;
        instructions.style.display = "none";
        lottie.style.display = "block";
        autocompleteList.style.display = "none";
    } else {
        checkCurrentLocation();
        instructions.style.display = "none";
    }
});

// دالة جلب بيانات الطقس باستخدام اسم المدينة
async function checkWeather(city) {
    const apiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&";
    try {
        const response = await fetch(apiUrl + `q=${city}&appid=${apiKey}`);
        if (response.status === 404) {
            showError();
        } else {
            const data = await response.json();
            displayWeather(data);
            initMap(data.coord.lat, data.coord.lon);
        }
    } catch (error) {
        showError();
        console.error("Error fetching weather data:", error);
    }
    autocompleteList.style.display = "none";
}
