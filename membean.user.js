// ==UserScript==
// @name         멤빈
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  앙 멤빈
// @author       YourName
// @match        https://membean.com/training_sessions/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
        button.textContent = 'get answer';
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

        const answerDiv = document.createElement('div');
        answerDiv.style.cssText = `
            margin-top: 15px;
            background-color: #333;
            padding: 10px;
            border-radius: 5px;
            word-wrap: break-word;
        `;

        content.appendChild(button);
        content.appendChild(answerDiv);
        tab.appendChild(content);

        document.body.appendChild(tab);

        button.addEventListener('click', async () => {
            button.disabled = true;
            button.style.opacity = '0.7';
            const questionText = document.querySelector('.question').innerText;
            const choices = [];
            const choiceWords = document.querySelectorAll('#choice-section .choice-word');
            
            if (choiceWords.length > 0) {
                choiceWords.forEach(choice => {
                    choices.push(choice.innerText);
                });
            } else {
                const alternativeChoices = document.querySelectorAll('#choice-section .choice');
                alternativeChoices.forEach(choice => {
                    if (choice.id !== 'notsure') {
                        choices.push(choice.innerText.trim());
                    }
                });
            }
            const answer = await gemini(questionText, choices);
            answerDiv.textContent = answer;
            button.disabled = false;
            button.style.opacity = '1';
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
        });

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
        openTabButton();
    });

    async function gemini(q, c) {
        const API_KEY = "YOUR-API-KEY";
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-exp-0827:generateContent?key=${API_KEY}`;

        try {
            const response = await fetch(GEMINI_API_URL, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `choices:${c.join(', ')} question:${q}  please find the correct answer. just say the answers from the choices`
                        }]
                    }]
                }),
            });

            const result = await response.json();
            return result.candidates[0].content.parts[0].text;
        } catch (error) {
            return "An error occurred, please try again.";
        }
    }

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
