// ==UserScript==
// @name         Block Zhihu answers and comments by IP locations
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  屏蔽来自指定IP属地的回答、展开评论和预览评论，支持点击展开/折叠原内容查看。
// @author       Lil
// @match        https://www.zhihu.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    function getBlockedIPs() {
        return GM_getValue("blocked_ip_locations", []);
    }

    function editBlockedIPs() {
        let now = getBlockedIPs().join("|");
        let input = prompt("编辑 [屏蔽IP归属地]\n（用 | 分隔，例如：北京|上海|美国）", now);
        if (input === "") {
            GM_setValue("blocked_ip_locations", []);
        } else if (input != null) {
            GM_setValue("blocked_ip_locations", input.split("|"));
        }
    }

    GM_registerMenuCommand("编辑屏蔽IP归属地", editBlockedIPs);

    function filterIP(node) {
        if (!node) return;
        let blocked = getBlockedIPs();
        if (!blocked.length) return;

        // 查找省份/地区标签
        let ipNode = node.querySelector(".css-ntkn7q");
        if (ipNode) {
            let text = ipNode.textContent.trim();
            for (let keyword of blocked) {
                if (keyword && text.includes(keyword)) {
                    if (!node.dataset.blocked) {
                        node.dataset.blocked = "true";

                        node.style.display = "none";

                        let placeholder = document.createElement("div");
                        placeholder.textContent = `  已屏蔽来自【${text}】的内容（点击展开）`;
                        placeholder.style.cssText = `
                            padding: 6px 8px;
                            margin: 4px 0;
                            background: #f5f5f5;
                            color: #999;
                            font-size: 13px;
                            font-style: italic;
                            border-left: 3px solid #ccc;
                            cursor: pointer;
                        `;

                        placeholder.addEventListener("click", () => {
                            if (node.style.display === "none") {
                                node.style.display = "";
                                placeholder.textContent = `  已展开来自【${text}】的内容（点击折叠）`;
                            } else {
                                node.style.display = "none";
                                placeholder.textContent = `  已屏蔽来自【${text}】的内容（点击展开）`;
                            }
                        });

                        node.parentNode.insertBefore(placeholder, node);
                    }
                    return;
                }
            }
        }
    }

    function scanAll() {
        // 回答 + 评论 + 评论预览
        document.querySelectorAll(
            '.List-item, .Card, .CommentItemV2, .ContentItem, .css-140jo2, .CommentTopMeta'
        ).forEach(node => filterIP(node));
    }

    const observer = new MutationObserver(mutations => {
        for (let mutation of mutations) {
            for (let target of mutation.addedNodes) {
                if (target.nodeType === 1) {
                    filterIP(target);
                    target.querySelectorAll &&
                        target.querySelectorAll(
                            '.List-item, .Card, .CommentItemV2, .ContentItem, .css-140jo2, .CommentTopMeta'
                        ).forEach(node => filterIP(node));
                }
            }
        }
    });

    observer.observe(document, { childList: true, subtree: true });

    scanAll();
})();
