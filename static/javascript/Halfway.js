class HalfwayMap extends MyMap {
    constructor(gMap, iconList, host_url) {
        super(gMap, iconList, host_url);
    }

    // 현재 지점을 중심으로 재검색 버튼 이벤트 설정
    async setMidAdrEvent() {
        const midRediscoverButtons = document.querySelectorAll(".midRediscover");

        midRediscoverButtons.forEach(function (button) {
            // 이미 클릭 이벤트 리스너가 등록되어 있는지 체크
            if (!button.hasEventListener) {
                // 클릭 이벤트 리스너 등록
                button.addEventListener("click", function () {
                    const value = button.value;
                    const midRediscover_jsonData = JSON.parse(value);
                    console.log(midRediscover_jsonData);
                    HalfwaySearch(marker_iconList, midRediscover_jsonData);
                });

                // 이벤트 리스너 등록 상태 표시
                button.hasEventListener = true;
            }
        });
    }

    // 중간지점 마커 생성
    createMidMarkers(responseData, midpoint, midcontent) {
        const midcontent_name = `
            <div class="m_end">중간지점</div>
            <h2 class="m_title">${responseData.midpoint.name}</h2><hr>`;

        const markerMid = new google.maps.Marker({
            position: midpoint,
            map: this.gMap,
            title: responseData.midpoint.name,
            icon: this.marker_iconList.mid,
            tags: "mid",
        });

        const infoWindowMid = new google.maps.InfoWindow();

        markerMid.addListener("click", () => {
            infoWindowMid.setContent(midcontent_name + midcontent);
            infoWindowMid.open(this.gMap, markerMid);
        });
    }

    // 중간지점 근처 장소 마커 생성 함수
    async createPlaceMarkers(responseData, iconList) {
        const placeMarkers = []; // 동적으로 생성된 마커가 들어갈 배열

        // fetchPlacePhoto를 미리 가져오기
        const fetchPhoto = this.fetchPlacePhoto.bind(this);
        const callSetMidAdrEvent = this.setMidAdrEvent.bind(this);

        for (const placename of this.placetypes) {
            for (const placeinfo of responseData.midplaces[placename]) {
                const contentsName = `<h1 class="place_name">${placeinfo.name}</h1>`;
                let contentsMaintext = `
                <hr>
                <ul class="place_ul"><li>주소: ${placeinfo.vicinity}</li>
                <li>평점: <div class="stars" id="stars">${this.updateStars(placeinfo.rating)}</div></li></ul>
                <button class="midRediscover" value='{
                    "name":"${placeinfo.vicinity}",
                    "address": {
                        "lat": ${placeinfo.address.lat},
                        "lng": ${placeinfo.address.lng}
                    }
                }'>현재 지점을 중심으로 재검색</button>`;

                const P_marker = this.createMarker(placeinfo.address, placeinfo.name, iconList[placename], placename, {
                    get_image: false,
                }); // 마커 생성

                const P_infoWindow = new google.maps.InfoWindow({
                    content: contentsName + contentsMaintext,
                });

                P_marker.addListener("click", async function () {
                    const self = this; // this를 저장

                    if (self.data.get_image) {
                        P_infoWindow.open(self.gMap, P_marker);
                        // 버튼 요소들을 선택
                    } else {
                        new Promise(async function (resolve, reject) {
                            try {
                                const photoUrl = await fetchPhoto(placeinfo.name); // 미리 가져온 fetchPlacePhoto를 사용

                                P_infoWindow.setContent(contentsName + photoUrl + contentsMaintext);
                                P_infoWindow.open(self.gMap, P_marker);
                                self.data.get_image = true; // 저장한 this 사용

                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        }).then(() => {
                            callSetMidAdrEvent(); // this.setMidAdrEvent()를 call로 변경
                        });
                    }
                });

                P_marker.setVisible(false); // 생성한 마커를 숨겨둠
                placeMarkers.push(P_marker);
            }
        }
        return placeMarkers;
    }
}

//! ------------------------------- 중간지점 찾기 관련 함수 ---------------------------------------
// 중간지점 버튼 클릭 시 실행되는 함수
function HalfwaySearch(marker_iconList, midData) {
    console.log("hlafwayserch");
    // const rangeValue = document.getElementById("rangeSlider").value; // 근처 장소 반경 저장
    const addressInputs = document.querySelectorAll(".post_input_data"); // 인풋폼 저장
    const inputValues = [...addressInputs].map((input) => input.value); // 주소값 저장
    console.log(inputValues);
    const url = localhost_url + "/halfway"; // ajax요청 url
    console.log(url);
    let sendData = "";

    // 출발지점이 2개 이상인지 검사
    if (addressInputs.length < 2) {
        alert("출발지점이 2개 이상이어야 합니다. 출발지점 추가를 눌러 출발지점을 추가해주세요.");
        return;
    }

    // 출발지점이 비어있는지 검사
    if (inputValues.includes("")) {
        alert("출발지점이 입력되지 않았습니다. 빈 출발지점을 삭제하거나 주소를 입력해주세요.");
        return;
    }

    // 서버로 AJAX 요청을 보내기 위한 작업
    if (midData == undefined) {
        sendData = JSON.stringify({ addresses: inputValues, range: 1000 });
    } else {
        sendData = JSON.stringify({ addresses: inputValues, range: 1000, middata: midData });
    }
    fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
        },
        body: sendData,
    })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error("오류가 발생했습니다.");
            }
            return response.json();
        })
        .then(async (responseData) => {
            console.log("받은 데이터:", responseData);

            // 검색할 수 없는 주소일 때 오류처리
            if (responseData == null) {
                alert("오류가 발생했습니다. 출발지점의 주소가 정확히 입력되어있는지 확인해주세요.");
                return;
            }

            // 동적으로 생성할 마커들의 정보를 배열에 저장
            let dynamicMarkers = responseData.startpoint.map((data) => ({
                position: data.address,
                title: data.name,
                content: "출발지점 입니다.",
                icon: marker_iconList.start,
                tags: "start",
            }));

            const directionsService = new google.maps.DirectionsService(); // 길찾기 서비스 인스턴스 생성
            const midpoint = responseData.midpoint.address; // 중간지점 위치
            const map = CreateMap(midpoint); // 지도 초기화
            let hMap = new HalfwayMap(map, marker_iconList, localhost_url); // Map class 인스턴스 생성

            responseData_place = responseData.midplaces; // 중간지점 근처 장소 데이터 전역변수에 저장
            placeMarkers = await hMap.createPlaceMarkers(responseData, marker_iconList);

            copytext_midAdr = responseData.midpoint.name; // 중간지점 공지 생성용 어드레스

            // 길찾기 인스턴스 설정
            new google.maps.DirectionsRenderer({
                map,
                suppressMarkers: true,
            });

            (function () {
                let midcontent = "";

                const markerPromises = dynamicMarkers.map(function (markerInfo, index) {
                    return new Promise(function (resolve, reject) {
                        const colorCode = hMap.getRandomColor(); // 경로 랜덤 색깔
                        const marker = hMap.createMarker(markerInfo.position, markerInfo.title, markerInfo.icon, markerInfo.tags); // 시작지점 마커 생성

                        // 길찾기 옵션 설정
                        const request = {
                            origin: markerInfo.position,
                            destination: midpoint,
                            travelMode: google.maps.TravelMode.TRANSIT,
                        };

                        // 길찾기 옵션 설정
                        const directionsRenderer = new google.maps.DirectionsRenderer({
                            map,
                            suppressMarkers: true,
                            polylineOptions: {
                                strokeColor: colorCode,
                                strokeWeight: 7,
                            },
                        });

                        // 경로 찾기
                        directionsService.route(request, function (response, status) {
                            if (status == google.maps.DirectionsStatus.OK) {
                                const contents_info = `
                                <ul class="start_end_ul">
                                    <li>${response.routes[0].legs[0].departure_time.text} 출발 ~ ${response.routes[0].legs[0].arrival_time.text} 도착</li>
                                    <li>약 ${response.routes[0].legs[0].duration.text} 소요 예정</li>
                                    <li>총 이동 거리: ${response.routes[0].legs[0].distance.text}</li>
                                </ul>`;
                                midcontent += `<h3 class="adr_title">${marker.title}</h3> ${contents_info} <hr>`; //  MID마커에 표시될 데이터 저장

                                hMap.createRoute(contents_info, response, marker, directionsRenderer); // 경로 생성
                                resolve(); // 비동기 작업 완료
                            } else {
                                reject(new Error(markerInfo.title + "에서 중간지점으로 가는 경로를 찾을 수 없습니다: " + status));
                            }
                        });
                    });
                });

                // 모든 비동기 작업이 완료되길 기다림
                Promise.all(markerPromises)
                    .then(function () {
                        hMap.createMidMarkers(responseData, midpoint, midcontent); // 중간지점 마커 생성
                    })
                    .catch(function (error) {
                        console.error(error);
                    });
            })();
        })
        .catch((error) => {
            console.error("fetch 작업 중 문제가 발생했습니다:", error);
        });
}

//!------------------------ 공지 생성 ---------------------------------
let copytext_midAdr = "";

document.querySelector(".inform_btn").addEventListener("click", () => {
    const inform_time_v = document.getElementById("inform_time").value;
    const inform_info_v = document.getElementById("inform_info").value;
    const coptTextArea = document.getElementById("coptText");
    const inform_return_class = document.querySelector(".inform_return_off");
    inform_return_class ? inform_return_class.classList.remove("inform_return_off") : null;

    coptTextArea.value = `[모임 공지]
일시: ${inform_time_v}
장소: ${copytext_midAdr} 
내용: ${inform_info_v}

지도: https://www.google.co.kr/maps/place/${encodeURIComponent(copytext_midAdr)}`;
});

document.getElementById("coptText_btn").addEventListener("click", function () {
    let text = document.getElementById("coptText");
    text.select();
    document.execCommand("Copy");
    alert("성공적으로 복사되었습니다.");
});

document.getElementById("coptText").addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
});
