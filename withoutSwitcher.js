// ==UserScript==
// @name         Block Zhihu answers and comments by IP locations
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  屏蔽来自指定IP归属地的回答和评论，直接隐藏相关内容，无需展开/折叠开关。
// @author       Lil
// @match        404 - 知乎
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // 获取已屏蔽的IP归属地列表
    function getBlockedIPs() {
        return GM_getValue("blocked_ip_locations", []);
    }

    // 编辑屏蔽的IP归属地
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

    // 过滤指定IP归属地的内容
    function filterIP(node) {
        if (!node) return;
        let blocked = getBlockedIPs();
        if (!blocked.length) return;

        // 查找IP归属地标签
        let ipNode = node.querySelector(".css-ntkn7q");
        if (ipNode) {
            let text = ipNode.textContent.trim();
            for (let keyword of blocked) {
                if (keyword && text.includes(keyword)) {
                    // 直接隐藏屏蔽的内容
                    node.style.display = "none";
                    return;
                }
            }
        }
    }

    // 扫描页面中的所有回答和评论
    function scanAll() {
        document.querySelectorAll(
            '.List-item, .Card, .CommentItemV2, .ContentItem, .css-140jo2, .CommentTopMeta'
        ).forEach(node => filterIP(node));
    }

    // 监听新添加的节点，确保动态加载的内容也会被过滤
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

    // 初始扫描页面内容
    scanAll();
})();
