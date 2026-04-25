// ==UserScript==
// @name         知乎净化 Pro（黑名单 + UI面板 + 导入导出）
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  关键词/IP过滤 + 本地用户黑名单 + UI配置面板 + 导入导出
// @author        MeAliYeYe
// @match        https://www.zhihu.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  //---------------- 数据 ----------------
  const store = {
    get: (k, d) => GM_getValue(k, d),
    set: (k, v) => GM_setValue(k, v)
  };

  function getConfig() {
    return store.get("config", {
      ips: "",
      keywords: "",
      keywordOn: true,
      ipOn: true,
      userBlacklist: []
    });
  }

  function saveConfig(cfg) {
    store.set("config", cfg);
  }

  //---------------- UI 面板 ----------------
  function createPanel() {
    if (document.getElementById("zhihu-filter-panel")) return;

    const panel = document.createElement("div");
    panel.id = "zhihu-filter-panel";
    panel.innerHTML = `
    <div style="position:fixed;top:80px;right:20px;width:320px;background:#fff;border:1px solid #ccc;padding:10px;z-index:99999;font-size:12px;">
      <h3>知乎净化 Pro</h3>
      <label>IP规则</label>
      <input id="zf-ip" style="width:100%" />
      <label>关键词（正则）</label>
      <input id="zf-kw" style="width:100%" />
      <br><br>
      <label><input type="checkbox" id="zf-ip-on"> 启用IP过滤</label><br>
      <label><input type="checkbox" id="zf-kw-on"> 启用关键词过滤</label>
      <br><br>
      <button id="zf-save">保存</button>
      <button id="zf-export">导出</button>
      <button id="zf-import">导入</button>
      <hr>
      <button id="zf-close">关闭</button>
    </div>`;

    document.body.appendChild(panel);

    const cfg = getConfig();

    document.getElementById("zf-ip").value = cfg.ips;
    document.getElementById("zf-kw").value = cfg.keywords;
    document.getElementById("zf-ip-on").checked = cfg.ipOn;
    document.getElementById("zf-kw-on").checked = cfg.keywordOn;

    document.getElementById("zf-save").onclick = () => {
      cfg.ips = document.getElementById("zf-ip").value;
      cfg.keywords = document.getElementById("zf-kw").value;
      cfg.ipOn = document.getElementById("zf-ip-on").checked;
      cfg.keywordOn = document.getElementById("zf-kw-on").checked;
      saveConfig(cfg);
      alert("已保存");
    };

    document.getElementById("zf-export").onclick = () => {
      prompt("复制配置", JSON.stringify(cfg));
    };

    document.getElementById("zf-import").onclick = () => {
      let data = prompt("粘贴配置JSON");
      try {
        let obj = JSON.parse(data);
        saveConfig(obj);
        alert("导入成功，刷新页面");
      } catch (e) {
        alert("格式错误");
      }
    };

    document.getElementById("zf-close").onclick = () => panel.remove();
  }

  GM_registerMenuCommand("打开控制面板", createPanel);

  //---------------- 黑名单 ----------------
  function isBlacklisted(url) {
    const cfg = getConfig();
    return cfg.userBlacklist.includes(url);
  }

  function addBlacklist(url) {
    const cfg = getConfig();
    if (!cfg.userBlacklist.includes(url)) {
      cfg.userBlacklist.push(url);
      saveConfig(cfg);
    }
  }

  //---------------- 工具 ----------------
  function matchReg(text, regStr) {
    if (!regStr) return false;
    try {
      return new RegExp(regStr, "ig").test(text);
    } catch {
      return false;
    }
  }

  function hide(node) {
    node.style.display = "none";
  }

  //---------------- 过滤 ----------------
  function filter(node) {
    if (!node || node.dataset.filtered) return;
    node.dataset.filtered = 1;

    const cfg = getConfig();

    const userLink = node.querySelector("a.UserLink-link");
    const userUrl = userLink?.href;

    // 黑名单
    if (userUrl && isBlacklisted(userUrl)) {
      hide(node);
      return;
    }

    // 关键词
    if (cfg.keywordOn) {
      const text = node.innerText || "";
      if (matchReg(text, cfg.keywords)) {
        hide(node);
        if (userUrl) addBlacklist(userUrl);
        return;
      }
    }

    // IP
    if (cfg.ipOn) {
      const ipNode = node.querySelector(".css-ntkn7q");
      if (ipNode && matchReg(ipNode.innerText, cfg.ips)) {
        hide(node);
        if (userUrl) addBlacklist(userUrl);
        return;
      }
    }
  }

  //---------------- 监听 ----------------
  function scan() {
    document.querySelectorAll('.List-item,.Card,.CommentItemV2,.ContentItem').forEach(filter);
  }

  const ob = new MutationObserver(m => {
    m.forEach(r => r.addedNodes.forEach(n => {
      if (n.nodeType === 1) {
        filter(n);
        n.querySelectorAll && n.querySelectorAll('.List-item,.Card,.CommentItemV2,.ContentItem').forEach(filter);
      }
    }));
  });

  ob.observe(document, { childList: true, subtree: true });

  scan();
})();
