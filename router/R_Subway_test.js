const express = require("express"); // express 프레임워크
const router = express.Router();
const axios = require("axios");
const fs = require("fs"); // fs 모듈
const jsonFile = require("jsonfile");
const requestIp = require("request-ip");
const { allowedNodeEnvironmentFlags } = require("process");
const reverse = jsonFile.readFileSync("./static/json/line_reverse.json");
const line_json = jsonFile.readFileSync("./static/json/line.json");
const key = fs.readFileSync("./api/APIKey.txt");

function getDayOfWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0은 일요일, 1은 월요일, ..., 6은 토요일

    let data = dayOfWeek === 6 || dayOfWeek === 0 ? "9" : "8";
    return data;
}
//서울시 지하철 실시간 api
async function request_api(url) {
    try {
        const response = await axios.get(url);
        const obj = response.data;
        return obj;
    } catch (e) {
        console.error(`error: ${e}`);
    }
};

function processTimeTable(url, bstatnNm, btrainNo, s_line, recptnDt) {
    try {
        let SearchSTNTimeTableByFRCodeService_obj = request_api(url);
        const timeTable = SearchSTNTimeTableByFRCodeService_obj.body;
        let processdata = {};
        for (const data2 of timeTable) {
            const trnNo = data2.trnNo;
            const arvTm = data2.arvTm;
            const dptTm = data2.dptTm;
            var train_no = trnNo;
            var trainNo = btrainNo;
            var ariveTime = arvTm;
            var dptTime = dptTm;
            let delayInfo = "";
            processdata.btrainNo = trnNo;
            if (
                s_line == "1호선" ||
                s_line == "3호선" ||
                s_line == "4호선" ||
                s_line == "9호선" ||
                s_line == "경의중앙선" ||
                s_line == "경춘선" ||
                s_line == "수인분당선" ||
                s_line == "신분당선" ||
                s_line == "서해선" ||
                s_line == "우이신설선"
            ) {
                train_no = train_no.substring(1);
            }

            if (s_line === "2호선" && trainNo.charAt(0) == "3") {
                trainNo = trainNo.replace("3", "2");
            } else if (s_line === "2호선" && trainNo.charAt(0) == "6") {
                trainNo = trainNo.replace("6", "2");
            } else if (s_line === "2호선" && trainNo.charAt(0) == "7") {
                trainNo = trainNo.replace("7", "2");
            } else if (s_line === "2호선" && trainNo.charAt(0) == "8") {
                trainNo = trainNo.replace("8", "2");
            }
            if (arvTm != null) {
                if (trainNo === train_no) {
                    if (arvTm != null && processData.Position) {
                        let hours = parseInt(ariveTime.slice(0, 2), 10);
                        let minutes = parseInt(ariveTime.slice(2, 4), 10);
                        let seconds = parseInt(ariveTime.slice(4, 6), 10);
                        let currentDate = new Date();
                        let trainDate = new Date(
                            currentDate.getFullYear(),
                            currentDate.getMonth(),
                            currentDate.getDate(),
                            hours,
                            minutes,
                            seconds
                        );
                        let recptnDate = new Date(recptnDt);
                        recptnDate.setHours(
                            trainDate.getHours(),
                            trainDate.getMinutes(),
                            trainDate.getSeconds()
                        );
                        if (currentDate.getTime() > recptnDate.getTime()) {
                            let timeDiff = currentDate - recptnDate;
                            let minuesDelayed = Math.floor(timeDiff / (1000 * 60));
                            let secondsDelayed = Math.floor((timeDiff % (1000 * 60)) / 1000);
                            delayInfo = `${trnNo} ${bstatnNm}행 열차 ${minuesDelayed}분 ${secondsDelayed}초 지연 운행중`;
                        } else if (currentDate.getTime() < recptnDate.getTime()) {
                            let timeDiff = recptnDate - currentDate;
                            let minuesDelayed = Math.floor(timeDiff / (1000 * 60));
                            let secondsDelayed = Math.floor((timeDiff % (1000 * 60)) / 1000);
                            delayInfo = `${trnNo} ${bstatnNm}행 열차${minuesDelayed}분 ${secondsDelayed}초 조기 운행중`;
                        } else if (currentDate.getTime() === recptnDate.getTime()) {
                            delayInfo = `${trnNo} ${bstatnNm}행 열차 정시 운행중`;
                        }
                    }
                }
            } else if (dptTm != null && arvTm == null) {
                if (trainNo === train_no) {
                    if (dptTm != undefined || dptTm != null) {
                        var hours = parseInt(dptTime.slice(0, 2), 10);
                        var minutes = parseInt(dptTime.slice(2, 4), 10);
                        var seconds = parseInt(dptTime.slice(4, 6), 10);
                        var currentDate = new Date();
                        var trainDate = new Date(
                            currentDate.getFullYear(),
                            currentDate.getMonth(),
                            currentDate.getDate(),
                            hours,
                            minutes,
                            seconds
                        );
                        var recptnDate = new Date(recptnDt);
                        recptnDate.setHours(
                            trainDate.getHours(),
                            trainDate.getMinutes(),
                            trainDate.getSeconds()
                        );
                        if (currentDate.getTime() < recptnDate.getTime()) {
                            let timeDiff = recptnDate - currentDate;
                            let minuesDelayed = Math.floor(timeDiff / (1000 * 60));
                            let secondsDelayed = Math.floor((timeDiff % (1000 * 60)) / 1000);
                            delayInfo = `${trnNo} ${bstatnNm}행 열차 ${minuesDelayed}분 ${secondsDelayed}초 후 출발 예정`;
                        } else if (currentDate.getTime() == recptnDate.getTime()) {
                            delayInfo = `${trnNo} ${bstatnNm}행 열차 정시 출발`;
                        } else if (currentDate.getTime() > recptnDate.getTime()) {
                            let timeDiff = currentDate - recptnDate;
                            let minuesDelayed = Math.floor(timeDiff / (1000 * 60));
                            let secondsDelayed = Math.floor((timeDiff % (1000 * 60)) / 1000);
                            delayInfo = `${trnNo} ${bstatnNm}행 열차 ${minuesDelayed} 분 ${secondsDelayed}초 지연 출발`;
                        }
                    } else {
                        delayInfo = `${trnNo} ${bstatnNm}행 열차 출발 예정`;
                    }
                    processdata.delayInfo = delayInfo;


                }
            }

            return processdata;

        }
    } catch (error) {
        console.error("Error processing time table:", error);
    }
}




router.post("/", async (req, res_router) => {
    let s_response = req.body.response; // XSS 공격 방어
    console.log(`router.post: ${JSON.stringify(req.body)}`);
    const s_updnline = req.body.updnLine; //상행 하행 구별
    const s_line = req.body.subwayLine; //노선 받는 변수
    console.log(`${s_response}역\n 호선 : ${s_line}\n 상행 하행${s_updnline}`);
    const line = jsonFile.readFileSync(`./static/json/Line/${s_line}.json`);
    const rapid_line = jsonFile.readFileSync(`./static/json/Line/1호선_급행.json`);
    const express_line = jsonFile.readFileSync(`./static/json/Line/1호선_특급.json`);
    const reverse_updn = {
        1: "상행",
        2: "하행",
    };
    const line2_updn = {
        1: "내선",
        2: "외선",
    };

    const realArrive_url = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/20/${s_response}`;
    const realtimePosition_url = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimePosition/0/100/${s_line}`;
    // ""입력시 현재 운행중인 모든 역이 나오기 때문에 이를 방지
    if (s_response == "") {
        res_router.json("Subway", {
            result_Data: "<script>alert('지하철 역 이름을 입력해주세요.')</script>",
        });
        return 0;
    }
    // 마지막 글자가 "역"이면 역을 삭제함
    if (s_response.slice(-1) == "역") {
        s_response = s_response.slice(0, -1);
    }
    //api호출
    if (line[s_response] === s_line) {
        const realArrive_obj = await request_api(realArrive_url);
        const realtimePosition_obj = await request_api(realtimePosition_url);

        try {
            let resultJson = [];
            if (realArrive_obj.errorMessage.status === 200 && realtimePosition_obj.errorMessage.status === 200) {
                const s_data = realArrive_obj.realtimeArrivalList;
                const position = realtimePosition_obj.realtimePositionList;
                if (Array.isArray(s_data) && s_data.length > 0) {
                    s_data.forEach(data => {
                        if ((reverse_updn[s_updnline] === data.updnLine || line2_updn[s_updnline] === data.updnLine) && s_line === line_json[data.subwayId]) {
                            //field
                            const subwayId = line_json[data.subwayId];
                            const updnLine = data.updnLine;
                            const trainLineNm = data.trainLineNm;
                            const btrainNo = data.btrainNo;
                            const btrainSttus = data.btrainSttus;
                            const recptnDt = data.recptnDt;
                            const arvlMsg2 = data.arvlMsg2;
                            const arvlMsg3 = data.arvlMsg3;
                            const arvlCd = data.arvlCd
                            const bstatnNm = data.bstatnNm;
                            let processData = {
                                subwayId: subwayId,
                                updnLine: updnLine,
                                trainLineNm: trainLineNm,
                                btrainSttus: btrainSttus,
                                btrainNo: btrainNo,
                                recptnDt: recptnDt,
                                arvlMsg2: arvlMsg2,
                                arvlMsg3: arvlMsg3,
                                arvlCd: arvlCd
                            };
                            //추가 json 변수
                            let r_railOprIsttCd = jsonFile.readFileSync("./static/json/railOprIsttCd.json");
                            let railOprIsttCd = r_railOprIsttCd[s_line][arvlMsg3];
                            let r_InCd = jsonFile.readFileSync("./static/json/lnCd.json");
                            let InCd = r_InCd[s_line][arvlMsg3];
                            let r_stinCd = jsonFile.readFileSync("./static/json/stinCd.json");
                            let stinCd = r_stinCd[s_line][arvlMsg3];
                            let SearchSTNTimeTableByFRCodeService_url = `https://openapi.kric.go.kr/openapi/trainUseInfo/subwayTimetable?serviceKey=${fs.readFileSync(
                                "./api/kric_api.txt",
                                "utf-8"
                            )}&format=json&railOprIsttCd=${railOprIsttCd}&dayCd=${getDayOfWeek()}&lnCd=${InCd}&stinCd=${stinCd}`;
                            console.log(SearchSTNTimeTableByFRCodeService_url);
                            if (Array.isArray(position) && position.length > 0) {
                                position.forEach(data1 => {
                                    const statnNm = data1.statnNm;
                                    const directAt = data1.directAt;
                                    const lstcarAt = data1.lstcarAt;
                                    let trainNo = data1.trainNo;
                                    const trainSttus = data1.trainSttus;
                                    if (trainNo === processData.btrainNo) {
                                        processData.statnNm = data1.statnNm;
                                    }
                                    if (processData.btrainNo === trainNo) {
                                        if (trainSttus === "0" && directAt === "0" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 진입`;
                                        } else if (trainSttus === "1" && directAt === "0" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 도착`;
                                        } else if (trainSttus === "2" && directAt === "0" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 출발`;
                                        } else if (trainSttus === "3" && directAt === "0" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 전역출발`;
                                        } else if (trainSttus === "0" && directAt === "1" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 진입 (급행)`;
                                        } else if (trainSttus === "1" && directAt === "1" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 도착 (급행)`;
                                        } else if (trainSttus === "2" && directAt === "1" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 출발 (급행)`;
                                        } else if (trainSttus === "3" && directAt === "1" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 전역출발 (급행)`;
                                        } else if (trainSttus === "0" && directAt === "7" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 진입 (특급)`;
                                        } else if (trainSttus === "1" && directAt === "7" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 도착 (특급)`;
                                        } else if (trainSttus === "2" && directAt === "7" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 출발 (특급)`;
                                        } else if (trainSttus === "3" && directAt === "7" && lstcarAt === "0") {
                                            processData.Position = `${statnNm}역 전역출발 (특급)`;
                                        } else if (trainSttus === "0" && directAt === "0" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 진입 (막차)`;
                                        } else if (trainSttus === "1" && directAt === "0" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 도착 (막차)`;
                                        } else if (trainSttus === "2" && directAt === "0" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 출발 (막차)`;
                                        } else if (trainSttus === "3" && directAt === "0" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 전역출발 (막차)`;
                                        } else if (trainSttus === "0" && directAt === "1" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 진입 (급행) (막차)`;
                                        } else if (trainSttus === "1" && directAt === "1" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 도착 (급행) (막차)`;
                                        } else if (trainSttus === "2" && directAt === "1" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 출발 (급행) (막차)`;
                                        } else if (trainSttus === "3" && directAt === "1" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 전역출발 (급행) (막차)`;
                                        } else if (trainSttus === "0" && directAt === "7" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 진입 (특급) (막차)`;
                                        } else if (trainSttus === "1" && directAt === "7" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 도착 (특급) (막차)`;
                                        } else if (trainSttus === "2" && directAt === "7" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 출발 (특급) (막차)`;
                                        } else if (trainSttus === "3" && directAt === "7" && lstcarAt === "1") {
                                            processData.Position = `${statnNm}역 전역출발 (특급) (막차)`;
                                        } else if (statnTnm === s_response) {
                                            processData.Position = `${s_response}역 출발 대기중`;
                                        } else if (statnNm === s_response) {
                                            processData.Position = `${s_response}역 출발 대기중`;
                                        } else if (statnNm === s_response && trainSttus === "2" && directAt === "0" && lstcarAt === "0") {
                                            processData.Position = `${s_response}역 출발`;
                                        }
                                        try {
                                            let SearchSTNTimeTableByFRCodeService_obj = request_api(SearchSTNTimeTableByFRCodeService_url);
                                            console.log(`obj: ${JSON.stringify(SearchSTNTimeTableByFRCodeService_obj)}`);
                                            const timeTable = SearchSTNTimeTableByFRCodeService_obj.body;
                                            let processdata = {};
                                            timeTable.forEach(data2 => {
                                                const trnNo = data2.trnNo;
                                                const arvTm = data2.arvTm;
                                                const dptTm = data2.dptTm;
                                                var train_no = trnNo;
                                                var ariveTime = arvTm;
                                                var dptTime = dptTm;
                                                let delayInfo = "";
                                                processdata.btrainNo = trnNo;
                                                if (
                                                    s_line == "1호선" ||
                                                    s_line == "3호선" ||
                                                    s_line == "4호선" ||
                                                    s_line == "9호선" ||
                                                    s_line == "경의중앙선" ||
                                                    s_line == "경춘선" ||
                                                    s_line == "수인분당선" ||
                                                    s_line == "신분당선" ||
                                                    s_line == "서해선" ||
                                                    s_line == "우이신설선"
                                                ) {
                                                    train_no = train_no.substring(1);
                                                }

                                                if (s_line === "2호선" && trainNo.charAt(0) == "3") {
                                                    trainNo = trainNo.replace("3", "2");
                                                } else if (s_line === "2호선" && trainNo.charAt(0) == "6") {
                                                    trainNo = trainNo.replace("6", "2");
                                                } else if (s_line === "2호선" && trainNo.charAt(0) == "7") {
                                                    trainNo = trainNo.replace("7", "2");
                                                } else if (s_line === "2호선" && trainNo.charAt(0) == "8") {
                                                    trainNo = trainNo.replace("8", "2");
                                                }
                                                if (arvTm != null) {
                                                    if (trainNo === train_no) {
                                                        if (arvTm != null && processData.Position) {
                                                            let hours = parseInt(ariveTime.slice(0, 2), 10);
                                                            let minutes = parseInt(ariveTime.slice(2, 4), 10);
                                                            let seconds = parseInt(ariveTime.slice(4, 6), 10);
                                                            let currentDate = new Date();
                                                            let trainDate = new Date(
                                                                currentDate.getFullYear(),
                                                                currentDate.getMonth(),
                                                                currentDate.getDate(),
                                                                hours,
                                                                minutes,
                                                                seconds
                                                            );
                                                            let recptnDate = new Date(recptnDt);
                                                            recptnDate.setHours(
                                                                trainDate.getHours(),
                                                                trainDate.getMinutes(),
                                                                trainDate.getSeconds()
                                                            );
                                                            if (currentDate.getTime() > recptnDate.getTime()) {
                                                                let timeDiff = currentDate - recptnDate;
                                                                let minuesDelayed = Math.floor(timeDiff / (1000 * 60));
                                                                let secondsDelayed = Math.floor((timeDiff % (1000 * 60)) / 1000);
                                                                delayInfo = `${trnNo} ${bstatnNm}행 열차 ${minuesDelayed}분 ${secondsDelayed}초 지연 운행중`;
                                                            } else if (currentDate.getTime() < recptnDate.getTime()) {
                                                                let timeDiff = recptnDate - currentDate;
                                                                let minuesDelayed = Math.floor(timeDiff / (1000 * 60));
                                                                let secondsDelayed = Math.floor((timeDiff % (1000 * 60)) / 1000);
                                                                delayInfo = `${trnNo} ${bstatnNm}행 열차${minuesDelayed}분 ${secondsDelayed}초 조기 운행중`;
                                                            } else if (currentDate.getTime() === recptnDate.getTime()) {
                                                                delayInfo = `${trnNo} ${bstatnNm}행 열차 정시 운행중`;
                                                            }
                                                        }
                                                    }
                                                } else if (dptTm != null && arvTm == null) {
                                                    if (trainNo === train_no) {
                                                        if (dptTm != undefined || dptTm != null) {
                                                            var hours = parseInt(dptTime.slice(0, 2), 10);
                                                            var minutes = parseInt(dptTime.slice(2, 4), 10);
                                                            var seconds = parseInt(dptTime.slice(4, 6), 10);
                                                            var currentDate = new Date();
                                                            var trainDate = new Date(
                                                                currentDate.getFullYear(),
                                                                currentDate.getMonth(),
                                                                currentDate.getDate(),
                                                                hours,
                                                                minutes,
                                                                seconds
                                                            );
                                                            var recptnDate = new Date(recptnDt);
                                                            recptnDate.setHours(
                                                                trainDate.getHours(),
                                                                trainDate.getMinutes(),
                                                                trainDate.getSeconds()
                                                            );
                                                            if (currentDate.getTime() < recptnDate.getTime()) {
                                                                let timeDiff = recptnDate - currentDate;
                                                                let minuesDelayed = Math.floor(timeDiff / (1000 * 60));
                                                                let secondsDelayed = Math.floor((timeDiff % (1000 * 60)) / 1000);
                                                                delayInfo = `${trnNo} ${bstatnNm}행 열차 ${minuesDelayed}분 ${secondsDelayed}초 후 출발 예정`;
                                                            } else if (currentDate.getTime() == recptnDate.getTime()) {
                                                                delayInfo = `${trnNo} ${bstatnNm}행 열차 정시 출발`;
                                                            } else if (currentDate.getTime() > recptnDate.getTime()) {
                                                                let timeDiff = currentDate - recptnDate;
                                                                let minuesDelayed = Math.floor(timeDiff / (1000 * 60));
                                                                let secondsDelayed = Math.floor((timeDiff % (1000 * 60)) / 1000);
                                                                delayInfo = `${trnNo} ${bstatnNm}행 열차 ${minuesDelayed} 분 ${secondsDelayed}초 지연 출발`;
                                                            }
                                                        } else {
                                                            delayInfo = `${trnNo} ${bstatnNm}행 열차 출발 예정`;
                                                        }
                                                        processdata.delayInfo = delayInfo;
                                                    }
                                                }

                                            })
                                        } catch (error) {
                                            console.error("Error processing time table:", error);
                                        }
                                        console.log(processData);
                                        //processData.btrainNo = process.btrainNo;
                                        //processData.delayInfo = process.delayInfo;
                                    }
                                })
                            }
                            else if (position.btrainNo === undefined) {
                                resultJson = [{
                                    message: `${s_response}의 운행이 종료되었습니다.`,
                                    status: 500
                                }];
                            }
                            resultJson.push(processData);
                            // console.log(
                            //     `${new Date()}\n접속한 클라이언트의 IP : ${requestIp.getClientIp(req).substring(7)}`
                            // );

                        }
                    });
                    res_router.json(resultJson);
                }
            }
            console.log(resultJson);
        } catch (error) {
            console.error("Error:", error);
            throw error;
        }
    }
})

module.exports = router;