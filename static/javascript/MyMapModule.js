class MyMap {
    constructor(gMap, iconList, host_url) {
        this.gMap = gMap; // 구글맵 객체
        this.marker_iconList = iconList; // 아이콘 이미지 리스트
        this.localhost_url = host_url; // 서버 호스트 앞 주소
        this.placetypes = ["cafe", "convenience_store", "library", "bus_station", "subway_station", "restaurant"];
    }

    // 경로설정 시 경로 랜덤 색 추출
    getRandomColor() {
        const r = Math.floor(Math.random() * 255)
            .toString(16)
            .padStart(2, "0"); // 빨간색 값
        const g = Math.floor(Math.random() * 64)
            .toString(16)
            .padStart(2, "0"); // 녹색 값
        const b = Math.floor(Math.random() * 64)
            .toString(16)
            .padStart(2, "0"); // 파란색 값

        return `#${r}${g}${b}`;
    }

    // 장소추천 별점 생성
    updateStars(rating) {
        let contents = "";
        for (let i = 0; i < 5; i++) {
            contents += i < rating ? `<i class="fas fa-star filled"></i>` : `<i class="fas fa-star"></i>`;
        }
        return contents;
    }

    // 마커 동적 생성
    createMarker(position, title, icon, tags, data) {
        const markerOptions = {
            position: position,
            map: this.gMap,
            title: title,
            icon: icon,
            tags: tags,
        };
        if (data) {
            markerOptions["data"] = data;
        }

        return new google.maps.Marker(markerOptions);
    }

    // 경로 생성 함수
    createRoute(contents_info, response, marker, directionsRenderer) {
        const infoWindowContent = `
        <div class="m_start">출발지점</div>
        <h2 class="m_title">${marker.title}</h2><hr>
        ${contents_info}
        `;

        const infoWindow = new google.maps.InfoWindow({
            content: infoWindowContent,
        });

        marker.addListener("click", () => {
            infoWindow.open(this.gMap, marker);
        });

        directionsRenderer.setDirections(response);
    }

    // 대표 사진을 가져오는 함수
    async fetchPlacePhoto(placeId) {
        const parser = new DOMParser();

        const place_image_html = await fetch(`${this.localhost_url}/Suggestion/PlacePhoto?placeId=${placeId}`);
        const image_html = await place_image_html.json();

        let doc = parser.parseFromString(image_html.Html, "text/html");
        let imageElement = doc.getElementsByClassName("DS1iW")[0];

        if (imageElement) {
            let imageUrl = imageElement.getAttribute("src");
            if (imageUrl) {
                return `<img src="${imageUrl}" alt="대표 사진" width="300">`;
            } else {
                alert("검색 결과 이미지를 찾을 수 없습니다.");
            }
        } else {
            alert("검색 결과를 찾을 수 없습니다.");
        }
    }
}
