const localhost_url = "http://localhost:8080";
// const localhost_url = "www.skhuroad.com";

const marker_iconList = CreateIcon(); // 아이콘을 리스트에 저장
let placeMarkers = []; // 동적으로 생성한 마커들을 저장할 배열
let responseData_place; // 근처 장소들에 대한 json데이터를 저장
let Mydata = { lat: 37.4877347563341, lng: 126.82516487456813 }; // 기본 위도, 경도

document.addEventListener("DOMContentLoaded", () => {
    //! ---------- 지도 초기화 ----------
    navigator.geolocation.getCurrentPosition(
        (position) => {
            Mydata = { lat: position.coords.latitude, lng: position.coords.longitude };
            CreateStartMap(Mydata);
        },
        (error) => {
            console.error(error);
        }
    );

    //! ---------- 주소 입력 필드 관련 이벤트 ----------
    document.querySelector(".add-address").addEventListener("click", addInput); // 추가 버튼 클릭 시 실행
    activateRemoveButtons(); // 기존 삭제 버튼 활성화

    // 모든 input 요소에 주소 자동 완성 기능 활성화
    document.querySelectorAll('input[name="address"]').forEach(function (input) {
        new google.maps.places.Autocomplete(input);
    });

    // Mapping X버튼 클릭 시 입력 내용 삭제
    document.getElementById("reset-button").addEventListener("click", () => {
        document.getElementById("textInput").value = "";
    });

    //.con-search 요소의 부모 요소 .way-list에 이벤트 리스너를 등록 (Halfway X버튼 삭제 이벤트)
    document.querySelector(".way-list").addEventListener("click", function (event) {
        if (event.target.classList.contains("xMark")) {
            event.target.closest(".con-search").querySelector(".search-input").value = "";
        }
    });

    // Mapping - enter키 누를 때 버튼 클릭 처리
    document.getElementById("textInput").addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            MappingSearch(marker_iconList, Mydata);
        }
    });

    //! ---------- 상단 필터 관련 이벤트 ----------
    // 라디오 버튼들에 대해 클릭 이벤트 리스너 추가
    document.querySelectorAll(".radio-label input[type='radio']").forEach((radio) => {
        radio.addEventListener("click", handleRadioClick);
    });

    //! ---------- 중간지점, 길찾기 검색 이벤트 ----------
    // 중간지점 찾기 버튼 클릭 시 실행되는 핸들러
    document.getElementById("mid_btn").addEventListener("click", () => {
        HalfwaySearch(marker_iconList);
    });

    // 길찾기 버튼 클릭 시 실행되는 핸들러
    document.getElementById("btn").addEventListener("click", () => {
        MappingSearch(marker_iconList, Mydata);
    });
});

//! ---------- 지도 관련 함수 ----------
function CreateMap(address) {
    return new google.maps.Map(document.getElementById("map"), {
        center: address, // 초기 위치 설정
        zoom: 12, // 확대/축소 레벨
    });
}

function CreateStartMap(address) {
    let map = CreateMap(address);

    infoWindow = new google.maps.InfoWindow();

    marker = new google.maps.Marker({
        map: map,
        position: address,
        title: "현재위치",
    });

    // 마커를 클릭했을 때 정보창 열기
    marker.addListener("click", function () {
        getAddress(address, function (address) {
            infoWindow.setContent("현재 주소: " + address);
            infoWindow.open(map, marker);
        });
    });

    return map;
}

function getAddress(latlng, callback) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latlng }, function (results, status) {
        if (status === "OK") {
            if (results[0]) {
                callback(results[0].formatted_address);
            } else {
                callback("주소를 찾을 수 없습니다.");
            }
        } else {
            callback("주소 변환에 실패했습니다. 상태: " + status);
        }
    });
}

//! ---------- 주소 입력 필드 관련 함수 ----------
// 새 인풋필드 추가
function addInput() {
    const addressInputTemplate = `<div class="search-bar">
        <div class="con-search way">
            <img class="searchIcon" src="searchIcon.svg" alt="">
            <input class="search-input post_input_data" autocomplete="none" type="text" id="textInput" class="form-control" name="address" placeholder="출발 지점">
            <img id="reset-button" class="xMark plus_input" src="xMark.svg" alt="지우기">
        </div>
        <button id="" class="remove-btn remove-address" type="button">삭제</button>
    </div> `;

    document.querySelector(".way-list").insertAdjacentHTML("beforeend", addressInputTemplate);
    activateRemoveButtons(); // 삭제 버튼 활성화

    // 주소 자동 완성 기능 활성화
    const addressInputs = document.querySelectorAll(".post_input_data");
    new google.maps.places.Autocomplete(addressInputs[addressInputs.length - 1]);
}

// 삭제 버튼 활성화
function activateRemoveButtons() {
    const removeButtons = document.querySelectorAll(".remove-btn");
    removeButtons.forEach((button) => {
        button.addEventListener("click", function () {
            button.parentElement.remove(); // 해당 버튼의 부모 엘리먼트를 삭제
        });
    });
}

//! ---------- 상단 필터 관련 함수 ----------
// 라디오 버튼 클릭 이벤트를 처리하는 함수
function handleRadioClick(event) {
    if (event.target.tagName === "INPUT" && event.target.type === "radio") {
        const selectedValue = this.value;

        // 버튼 클래스 중 "selected"를 제거 (선택된 버튼 초기화)
        document.querySelectorAll(".radio-label").forEach((label) => {
            label.classList.remove("selected");
        });
        this.closest(".radio-label").classList.add("selected"); // 누른 버튼에 클래스 추가

        responseData_place[selectedValue].length === 0 ? alert(`${selectedValue}에 대한 정보가 없습니다.`) : null; // 해당하는 정보가 없을 경우 실행

        // 마커의 태그에 선택한 값이 포함되어 있으면 보이게 설정
        placeMarkers.forEach((marker) => {
            marker.setVisible(marker.tags.includes(selectedValue));
        });
    }
}

//! ---------- 구글 맵 마커 아이콘 생성 ----------
function CreateIcon() {
    const iconList = ["start", "mid", "cafe", "convenience_store", "library", "bus_station", "subway_station", "restaurant"];
    let isIconList = {};

    iconList.forEach((data) => {
        const icon = {
            url: `${data}_icon.png`,
            scaledSize: new google.maps.Size(40, 40), // 이미지 크기 조정
        };
        isIconList[data] = icon;
    });
    return isIconList;
}
