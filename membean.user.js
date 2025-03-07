// ==UserScript==
// @name         Membean - for usually
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  응 멤빈 auto click
// @author       imminseohoe
// @match        https://membean.com/training_sessions/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const studyTime = 100 //seconds
    const accuracy = 60 //persent
    const problemTime = 20 // seconds
    const pageCheck = 19 // checking interval 


    let pageCheckInterval;
    let logOutputDiv; // console 출력 div
    // 기존 console.log, warn, error 함수 저장
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    // console.log
    console.log = function() {
        if (logOutputDiv) {
            let message = Array.from(arguments).join(' ');
            logOutputDiv.innerHTML += `<p style="color: white;">${message}</p>`;
             logOutputDiv.scrollTop = logOutputDiv.scrollHeight; // 스크롤 아래로
        }
        originalConsoleLog.apply(console, arguments);
    };

    // console.warn
    console.warn = function() {
        if (logOutputDiv) {
            let message = Array.from(arguments).join(' ');
            logOutputDiv.innerHTML += `<p style="color: red;">[Warning] ${message}</p>`;
            logOutputDiv.scrollTop = logOutputDiv.scrollHeight;
        }
        originalConsoleWarn.apply(console, arguments);
    };

    // console.error
    console.error = function() {
        if (logOutputDiv) {
            let message = Array.from(arguments).join(' ');
            logOutputDiv.innerHTML += `<p style="color: red;">[Error] ${message}</p>`;
            logOutputDiv.scrollTop = logOutputDiv.scrollHeight;
        }
        originalConsoleError.apply(console, arguments);
    };


    function pageCheckIntervalFunction() {
        const pageType = getPageType();
        //console.log("페이지 유형:", pageType);

            if (pageType === 'study') {
                clearInterval(pageCheckInterval);
                studyPageHandler();

                setTimeout(() => {
                    pageCheckInterval = setInterval(pageCheckIntervalFunction, pageCheck*1000);
                }, studyTime*1000 + 5000);
            }
            else if (pageType === 'problem'){
            clearInterval(pageCheckInterval);
            solveMembeanAssignment('problem').then(() => {

                setTimeout(() => {
                    pageCheckInterval = setInterval(pageCheckIntervalFunction, pageCheck*1000);
                }, problemTime*1000 +2000);
            });
            }
            else{
                clearInterval(pageCheckInterval);
                solveMembeanAssignment('spell').then(() => {
                    setTimeout(() => {
                        pageCheckInterval = setInterval(pageCheckIntervalFunction, pageCheck*1000);
                    }, problemTime*1000 +2000);
                });
            }
    }


    const getPageType = () => {
        if (document.getElementById('next-btn') && document.querySelector('#context-paragraph')) {
            return 'study';
        }
         else if(document.getElementById('wordspell')){
           // console.log('spell')
            return 'spell';
        }
        else {
            return "problem"
        }
    };

    async function solveMembeanAssignment(PageType) {
        const SESSION_ID = window.location.pathname.split('/')[2];
        const BASE_URL = "https://membean.com";
        const ADVANCE_URL = `${BASE_URL}/training_sessions/${SESSION_ID}/advance`;
        const barrierValue = getPassFormBarrierValue();
        const delayTime = problemTime





        const barrier = barrierValue
        if (barrier) {
           // console.log(`Extracted barrier value: ${barrier}`);
            console.log("Submitting 'Pass' answer...");
            const submitResult = await submitPassAnswer(ADVANCE_URL, SESSION_ID, barrier,PageType);
            if (submitResult.success) {
                console.log("Successfully submitted 'Pass'");

                var myQuestionInstance = new MB.Question({});
                myQuestionInstance.updateResult(true)

                setTimeout(function () {
                      location.reload(true);
                    },delayTime*1000);


            } else {
                console.error("Pass submission failed or encountered issues.");
                //console.error("Submission Error:", submitResult.error);
               // console.error("Response Text (if any):", submitResult.responseText);
            }
        } else {
            //console.error("Could not find barrier value");
        }
    }


    async function submitPassAnswer(advanceURL, sessionId, barrierValue,pageType) {
        const payload = new URLSearchParams();
        if (probalility(accuracy)){

            if (pageType == 'problem'){
                payload.append("event", "answer!");
                payload.append("pass", "true");
                payload.append("id", sessionId);
                payload.append("barrier", barrierValue);
                payload.append("google", 'ab');
                payload.append("it", 0);
                payload.append("more_ts", 'ostentatious');
            }
            else if (pageType == 'spell'){
                payload.append("event", "finish_study!");
                payload.append("pass", "true");
                payload.append("id", sessionId);
                payload.append("barrier", barrierValue);
                payload.append("google", 'ab');
                payload.append("it", 90000);
                payload.append("more_ts", 'ostentatious');
            }
            try {
                const response = await fetch(advanceURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: payload.toString()
                });

                if (!response.ok) {
                    return { success: false, error: `HTTP error! status: ${response.status}`, responseText: await response.text() };
                }
                const responseText = await response.text();
            //  console.log("Pass submission status code:", response.status);
                return { success: true, responseText: responseText };

            } catch (error) {
                return { success: false, error: error.message };
            }
    }
    else {
        console.log('faill')
        const aaa = document.getElementById("notsure")
        aaa.click()
        return {success: true};
    }}

    function getPassFormBarrierValue() {
        try{
                const passButton = document.querySelector('input[type="submit"][value="Pass"]');
        const passForm = passButton.closest('form');
        const barrierInput = passForm.querySelector('input[name="barrier"]');
        return barrierInput.value;
        } catch{
            console.error("error occured");
            return null;
        }


      }
      function probalility(percent){

        if (percent >= Math.floor(Math.random() * 100) + 1){
            return true
        }
        return false

    }
      const studyPageHandler = () => {
        //console.log(" study 감지됨");
        let countdown = studyTime
        console.log(`${countdown} seconds until 'Next' button click`);
        const countdownInterval = setInterval(() => {
            countdown--;
            console.log(`${countdown} seconds until 'Next' button click`);
            if (countdown <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);

        setTimeout(() => {
            clearInterval(countdownInterval);
            const nextButton = document.getElementById('next-btn');
            const targetElement = document.querySelector('li.choice.answer');
            targetElement.className = 'choice answer correct';
            if (nextButton) {

                nextButton.click();
                console.log(" Go to the next page");
            } else {
                console.warn(" Could not find 'Next' button ");
            }
        }, studyTime*1000); // 45 seconds 유저가 변경 가능하게 만들기 studyTime = 45000 //defult
    };

    pageCheckInterval = setInterval(pageCheckIntervalFunction, pageCheck);


    const createCustomTab = () => {
 
        const tab = document.createElement('div');
        tab.id = 'custom-tab';
        tab.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            height: 250px;
            background-color: #222;
            color: #fff;
            z-index: 10000;
            overflow: hidden;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #333;
            padding: 10px;
            cursor: move;
        `;

        const title = document.createElement('span');
        title.textContent = '멤비니';
        title.style.fontWeight = 'bold';

        const buttonContainer = document.createElement('div');

        const createHeaderButton = (text, onClick) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.cssText = `
                background: none;
                border: none;
                color: #fff;
                cursor: pointer;
                font-size: 16px;
                margin-left: 10px;
            `;
            button.addEventListener('click', onClick);
            return button;
        };

        const minimizeBtn = createHeaderButton('−', () => {
            tab.remove();
            openTabButton();

        });
        function deleteTab() {
            const tab = document.getElementById('custom-tab');
            if (tab) {
                tab.remove();
            }
        }
        const closeBtn = createHeaderButton('×', () => {
            deleteTab();
        });

        buttonContainer.appendChild(minimizeBtn);
        buttonContainer.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(buttonContainer);
        tab.appendChild(header);

        const content = document.createElement('div');
        content.style.cssText = `
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            padding: 15px;
            overflow-y: auto;
        `;

        const button = document.createElement('button');
        button.textContent = 'Get Answer';
        button.style.cssText = `
            background-color: #fff;
            color: #222;
            border: none;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.3s;
        `;
        button.addEventListener('mouseover', () => button.style.backgroundColor = '#ddd');
        button.addEventListener('mouseout', () => button.style.backgroundColor = '#fff');

        logOutputDiv = document.createElement('div'); // answerDiv를 logOutputDiv에 할당
        logOutputDiv.style.cssText = `
            margin-top: 15px;
            background-color: #333;
            padding: 10px;
            border-radius: 5px;
            word-wrap: break-word;
            height: 100px;
            overflow-y: scroll;
            color: white;
        `;

        content.appendChild(button);
        content.appendChild(logOutputDiv);
        tab.appendChild(content);

        document.body.appendChild(tab);

        button.addEventListener('click', () => {
            pageCheckIntervalFunction()
        });

        let isDragging = false;
        let startX, startY, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = tab.offsetLeft;
            initialY = tab.offsetTop;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        })

        const onMouseMove = (e) => {
            if (isDragging) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                tab.style.left = `${initialX + dx}px`;
                tab.style.top = `${initialY + dy}px`;
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    };

    window.addEventListener('load', function() {
        createCustomTab()
    });

    const openTabButton = () => {
        const button = document.createElement('button');
        button.textContent = '멤비니 열기';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 10px 15px;
            background-color: #222;
            color: #fff;
            border: none;
            border-radius: 5px;
            z-index: 10000;
            cursor: pointer;
            font-family: Arial, sans-serif;
            font-weight: bold;
            transition: background-color 0.3s;
        `;
        button.addEventListener('mouseover', () => button.style.backgroundColor = '#444');
        button.addEventListener('mouseout', () => button.style.backgroundColor = '#222');

        button.addEventListener('click', () => {
            button.remove();
            createCustomTab();
        });

        document.body.appendChild(button);
    };

})();
