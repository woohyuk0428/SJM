class MappingMap extends MyMap {
    constructor(gMap, iconList, host_url) {
        super(gMap, iconList, host_url);
    }

    // 도착지점 마커 생성
    createEndMarkers(responseData, endpoint, midcontent) {
        const midcontent_name = `
            <div class="m_end">도착지점</div>
            <h2 class="m_title">${responseData.endpoint[0].name}</h2><hr>`;

        const markerEnd = new google.maps.Marker({
            position: endpoint,
            map: this.gMap,
            title: responseData.endpoint[0].name,
            icon: this.marker_iconList.mid,
            tags: "end",
        });

        const infoWindowEnd = new google.maps.InfoWindow();

        markerEnd.addListener("click", () => {
            infoWindowEnd.setContent(midcontent_name + midcontent);
            infoWindowEnd.open(this.gMap, markerEnd);
        });
    }

    // 도착지점 근처 장소 마커 생성 함수
    async createPlaceMarkers(responseData, iconList) {
        const placeMarkers = []; // 동적으로 생성된 마커가 들어갈 배열
        const fetchPhoto = this.fetchPlacePhoto.bind(this); // fetchPlacePhoto를 미리 가져오기

        for (const placename of this.placetypes) {
            for (const placeinfo of responseData.places[placename]) {
                const contentsName = `<h1 class="place_name">${placeinfo.name}</h1>`;
                let contentsMaintext = `
                    <hr>
                    <ul class="place_ul"><li>주소: ${placeinfo.vicinity}</li>
                    <li>평점: <div class="stars" id="stars">${this.updateStars(placeinfo.rating)}</div></li></ul>`;

                const P_marker = this.createMarker(placeinfo.address, placeinfo.name, iconList[placename], placename, {
                    get_image: false,
                }); // 마커 생성

                const P_infoWindow = new google.maps.InfoWindow({
                    content: contentsName + contentsMaintext,
                });

                P_marker.addListener("click", async function () {
                    const self = this; // this를 저장

                    if (self.data.get_image) {
                        P_infoWindow.open(self, P_marker);
                        // 버튼 요소들을 선택
                    } else {
                        new Promise(async function (resolve, reject) {
                            try {
                                const photoUrl = await fetchPhoto(placeinfo.name);

                                P_infoWindow.setContent(contentsName + photoUrl + contentsMaintext);
                                P_infoWindow.open(self.gMap, P_marker);
                                self.data.get_image = true; // 저장한 this 사용
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
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

//! ------------------------------- 길찾기 관련 함수 ---------------------------------------
let save_queue = [];
// 중간지점 버튼 클릭 시 실행되는 함수
function MappingSearch(marker_iconList, Mydata) {
    //---------------------------------------------
    let form_control = document.getElementById("textInput").value;
    let ulElement = document.createElement("ol");

    save_queue.length >= 5 ? save_queue.pop() : null;
    save_queue.unshift(form_control);
    console.log(save_queue);
    console.log(save_queue.length);

    save_queue.forEach((data) => {
        var liElement = document.createElement("li");
        liElement.textContent = data;
        ulElement.appendChild(liElement);
    });
    form_control_element = document.getElementById("form_control_text");
    form_control_element.removeChild(form_control_element.firstChild);
    form_control_element.appendChild(ulElement);

    //-----------------------------

    // const rangeValue = 300;
    const inputValues = document.querySelector('input[name="address"]').value; // 인풋폼 저장
    const M_url = localhost_url + "/Mapping/data"; // ajax요청 url
    let sendData = "";

    // 서버로 AJAX 요청을 보내기 위한 작업
    sendData = JSON.stringify({ startpoint: Mydata, addresses: inputValues, range: 1000 });
    console.log(sendData);
    fetch(M_url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
        },
        body: sendData,
    })
        .then(async (response) => {
            console.log(response.ok);
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
            let dynamicMarkers = [
                {
                    position: responseData.startpoint.address,
                    title: responseData.startpoint.name,
                    content: "출발지점 입니다.",
                    icon: marker_iconList.start,
                    tags: "start",
                },
            ];

            const directionsService = new google.maps.DirectionsService(); // 길찾기 서비스 인스턴스 생성
            const endpoint = responseData.endpoint[0].address; // 중간지점 위치
            const map = CreateMap(endpoint); // 지도 초기화
            let mMap = new MappingMap(map, marker_iconList, localhost_url);

            responseData_place = responseData.places; // 중간지점 근처 장소 데이터 전역변수에 저장
            placeMarkers = await mMap.createPlaceMarkers(responseData, marker_iconList);

            // 길찾기 인스턴스 설정
            new google.maps.DirectionsRenderer({
                map,
                suppressMarkers: true,
            });

            (function () {
                let midcontent = "";

                const markerPromises = dynamicMarkers.map(function (markerInfo, index) {
                    return new Promise(function (resolve, reject) {
                        const colorCode = mMap.getRandomColor(); // 경로 랜덤 색깔
                        const marker = mMap.createMarker(markerInfo.position, markerInfo.title, markerInfo.icon, markerInfo.tags); // 시작지점 마커 생성

                        // 길찾기 옵션 설정
                        const request = {
                            origin: markerInfo.position,
                            destination: endpoint,
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
                                midcontent += `<h3 class="adr_title">${markerInfo.title}</h3> ${contents_info} <hr>`; //  MID마커에 표시될 데이터 저장

                                mMap.createRoute(contents_info, response, marker, directionsRenderer); // 경로 생성
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
                        mMap.createEndMarkers(responseData, endpoint, midcontent); // 도착지점 마커 생성
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
