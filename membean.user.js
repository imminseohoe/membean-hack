// ==UserScript==
// @name         Membean - for usually
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Auto solver for Membean - accuracy only for problem pages
// @author       imminseohoe
// @match        https://membean.com/training_sessions/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const studyTime = 100;  // Time to wait on study pages (seconds)
    const accuracy = 80;    // Desired accuracy for problem pages (percent)
    const problemTime = 20; // Time to wait on spell/problem pages (seconds)
    const pageCheck = 19;   // Interval to check page type (seconds)

    let pageCheckInterval;

    // Helper functions for counters (used only for problem pages)
    function getCounter(key) {
        const value = localStorage.getItem(key);
        return value ? parseInt(value) : 0;
    }

    function setCounter(key, value) {
        localStorage.setItem(key, value);
    }

    // Determine the current page type
    const getPageType = () => {
        if (document.getElementById('next-btn') && document.querySelector('#context-paragraph')) {
            return 'study';
        } else if (document.getElementById('wordspell')) {
            return 'spell';
        } else {
            return 'problem';
        }
    };

    // Handle "study" pages (always correct, no accuracy)
    const studyPageHandler = () => {
        let countdown = studyTime;
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
            if (targetElement) {
                targetElement.className = 'choice answer correct';
                console.log("Marked as correct");
            } else {
                console.warn("Could not find target element");
            }
            if (nextButton) {
                nextButton.click();
                console.log("Go to the next page");
            } else {
                console.warn("Could not find 'Next' button");
            }
        }, studyTime * 1000);
    };

    // Handle "spell" and "problem" pages
    async function solveMembeanAssignment(pageType) {
        const SESSION_ID = window.location.pathname.split('/')[2];
        const BASE_URL = "https://membean.com";
        const ADVANCE_URL = `${BASE_URL}/training_sessions/${SESSION_ID}/advance`;
        const barrierValue = getPassFormBarrierValue();
        const delayTime = problemTime;

        if (barrierValue) {
            if (pageType === 'problem') {
                // Apply accuracy logic for "problem" pages only
                const totalQuestionsKey = `membean_${SESSION_ID}_problem_total_questions`;
                const correctAnswersKey = `membean_${SESSION_ID}_problem_correct_answers`;
                let totalQuestions = getCounter(totalQuestionsKey);
                let correctAnswers = getCounter(correctAnswersKey);

                const currentAccuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
                const A = accuracy / 100; // Desired accuracy as a decimal
                const K = 1; // Adjustment factor
                let P = A + K * (A - currentAccuracy); // Adjusted probability
                P = Math.max(0, Math.min(1, P)); // Clamp between 0 and 1

                console.log(`Problem page - Total questions: ${totalQuestions}, Correct answers: ${correctAnswers}, Current accuracy: ${(currentAccuracy * 100).toFixed(2)}%, Adjusted P: ${(P * 100).toFixed(2)}%`);

                const answerCorrectly = Math.random() < P;

                if (answerCorrectly) {
                    console.log("Submitting correct answer...");
                    const submitResult = await submitPassAnswer(ADVANCE_URL, SESSION_ID, barrierValue, pageType);
                    if (submitResult.success) {
                        console.log("Successfully submitted correct answer");
                        var myQuestionInstance = new MB.Question({});
                        myQuestionInstance.updateResult(true);
                        correctAnswers += 1;
                    } else {
                        console.error("Correct answer submission failed.");
                    }
                } else {
                    console.log("Submitting incorrect answer...");
                    const notsureButton = document.getElementById("notsure");
                    if (notsureButton) {
                        notsureButton.click();
                        console.log("Clicked 'notsure'");
                    } else {
                        console.error("Could not find 'notsure' button");
                    }
                }
                totalQuestions += 1;
                setCounter(totalQuestionsKey, totalQuestions);
                setCounter(correctAnswersKey, correctAnswers);
            } else if (pageType === 'spell') {
                // Always submit correct for "spell" pages (no accuracy)
                console.log("Submitting correct answer for spell page...");
                const submitResult = await submitPassAnswer(ADVANCE_URL, SESSION_ID, barrierValue, pageType);
                if (submitResult.success) {
                    console.log("Successfully submitted correct answer");
                    var myQuestionInstance = new MB.Question({});
                    myQuestionInstance.updateResult(true);
                } else {
                    console.error("Correct answer submission failed.");
                }
            }
            setTimeout(() => {
                location.reload(true);
            }, delayTime * 1000);
        } else {
            console.error("Could not find barrier value");
        }
    }

    // Submit the correct answer for "spell" or "problem" pages
    async function submitPassAnswer(advanceURL, sessionId, barrierValue, pageType) {
        const payload = new URLSearchParams();
        if (pageType === 'problem') {
            payload.append("event", "answer!");
            payload.append("pass", "true");
            payload.append("id", sessionId);
            payload.append("barrier", barrierValue);
            payload.append("google", 'ab');
            payload.append("it", 0);
            payload.append("more_ts", 'ostentatious');
        } else if (pageType === 'spell') {
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
            return { success: true, responseText: responseText };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get the barrier value for form submission
    function getPassFormBarrierValue() {
        try {
            const passButton = document.querySelector('input[type="submit"][value="Pass"]');
            const passForm = passButton.closest('form');
            const barrierInput = passForm.querySelector('input[name="barrier"]');
            return barrierInput.value;
        } catch {
            console.error("Error occurred while getting barrier value");
            return null;
        }
    }

    // Main page checking loop
    function pageCheckIntervalFunction() {
        const pageType = getPageType();
        if (pageType === 'study') {
            clearInterval(pageCheckInterval);
            studyPageHandler();
            setTimeout(() => {
                pageCheckInterval = setInterval(pageCheckIntervalFunction, pageCheck * 1000);
            }, studyTime * 1000 + 5000);
        } else if (pageType === 'problem') {
            clearInterval(pageCheckInterval);
            solveMembeanAssignment('problem').then(() => {
                setTimeout(() => {
                    pageCheckInterval = setInterval(pageCheckIntervalFunction, pageCheck * 1000);
                }, problemTime * 1000 + 2000);
            });
        } else {
            clearInterval(pageCheckInterval);
            solveMembeanAssignment('spell').then(() => {
                setTimeout(() => {
                    pageCheckInterval = setInterval(pageCheckIntervalFunction, pageCheck * 1000);
                }, problemTime * 1000 + 2000);
            });
        }
    }

    // Start the script
    pageCheckInterval = setInterval(pageCheckIntervalFunction, pageCheck * 1000);

    
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
