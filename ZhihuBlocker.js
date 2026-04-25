// ==UserScript==
// @name         知乎屏蔽指定归属地并可选自动拉黑用户（带日志面板）
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  屏蔽来自指定IP归属地的回答和评论，并可选择是否自动将对应用户加入知乎黑名单，带拉黑日志查看功能。
// @author       MeAliYeYe
// @match        https://www.zhihu.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    //---------------- 屏蔽归属地 ----------------
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

    //---------------- 自动拉黑开关 ----------------
    function toggleAutoBlock() {
        let enabled = GM_getValue("auto_block_enabled", false);
        GM_setValue("auto_block_enabled", !enabled);
        alert("自动拉黑功能已 " + (!enabled ? "开启" : "关闭"));
    }

    //---------------- 拉黑日志 ----------------
    function addBlockedLog(userName, userUrl) {
        let logs = GM_getValue("blocked_users", []);
        // 避免重复
        if (logs.some(l => l.url === userUrl)) return;

        logs.push({
            name: userName || "未知用户",
            url: userUrl,
            time: new Date().toLocaleString()
        });
        GM_setValue("blocked_users", logs);
    }

    function viewBlockedLogs() {
        let logs = GM_getValue("blocked_users", []);
        if (!logs.length) {
            alert("暂无已拉黑用户记录。");
            return;
        }

        let msg = logs.map((l, i) =>
            `${i+1}. ${l.name}\n${l.url}\n时间: ${l.time}`
        ).join("\n\n");

        alert("已拉黑用户列表：\n\n" + msg);
    }

    GM_registerMenuCommand("编辑屏蔽IP归属地", editBlockedIPs);
    GM_registerMenuCommand("切换自动拉黑功能", toggleAutoBlock);
    GM_registerMenuCommand("查看已拉黑用户日志", viewBlockedLogs);

    //---------------- 拉黑请求 ----------------
    function blockUser(userUrl, userName) {
        if (!userUrl) return;

        // 提取 user_slug
        let match = userUrl.match(/people\/([^/?]+)/);
        if (!match) return;
        let userSlug = match[1];

        // 从 cookie 里取 xsrf
        let xsrf = document.cookie.match(/_xsrf=([^;]+)/);
        if (!xsrf) return;

        GM_xmlhttpRequest({
            method: "POST",
            url: `https://www.zhihu.com/api/v4/members/${userSlug}/actions/block`,
            headers: {
                "Content-Type": "application/json",
                "x-xsrf-token": decodeURIComponent(xsrf[1])
            },
            data: "{}",
            onload: function(res) {
                if (res.status === 200) {
                    console.log("✅ 已将用户拉黑:", userSlug);
                    addBlockedLog(userName, userUrl);
                } else {
                    console.warn("❌ 拉黑失败:", res.status, res.responseText);
                }
            }
        });
    }

    //---------------- 内容过滤 ----------------
    function filterIP(node) {
        if (!node) return;
        let blocked = getBlockedIPs();
        if (!blocked.length) return;

        let ipNode = node.querySelector(".css-ntkn7q");
        if (ipNode) {
            let text = ipNode.textContent.trim();
            for (let keyword of blocked) {
                if (keyword && text.includes(keyword)) {
                    node.style.display = "none";

                    // 检查是否启用自动拉黑
                    if (GM_getValue("auto_block_enabled", false)) {
                        let userLink = node.querySelector("a.UserLink-link");
                        let userName = node.querySelector(".UserLink-link")?.textContent.trim() || "未知用户";
                        if (userLink) {
                            blockUser(userLink.href, userName);
                        }
                    }
                    return;
                }
            }
        }
    }

    //---------------- 页面扫描 ----------------
    function scanAll() {
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
