(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function setText(id, value) {
    if (value === null || value === undefined || value === '') value = '—';
    $(id).textContent = String(value);
  }
  function error(box, message) {
    box.style.display = '';
    var old = box.querySelector('.tool-err');
    if (old) old.remove();
    var node = document.createElement('p');
    node.className = 'tool-err';
    node.setAttribute('role', 'alert');
    node.textContent = message;
    box.appendChild(node);
  }
  function clearError(box) {
    var old = box.querySelector('.tool-err');
    if (old) old.remove();
  }
  function busy(button, state, label) {
    button.disabled = state;
    button.setAttribute('aria-busy', String(state));
    button.textContent = label;
  }

  if (!window.fetch || !window.AbortController || !window.Promise || !window.URL) {
    error($('ipResult'), '当前浏览器不支持这些网络工具，请使用新版浏览器。下载页面不受影响。');
    ['btnIp', 'btnDns', 'btnSpeed'].forEach(function (id) { $(id).disabled = true; });
    return;
  }

  // The same timeout owns connection, headers and JSON body reading.
  function request(url, options, json) {
    var controller = new AbortController();
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; controller.abort(); }, 6000);
    options.signal = controller.signal;
    options.cache = 'no-store';
    options.credentials = 'omit';
    options.referrerPolicy = 'no-referrer';
    return fetch(url, options).then(function (response) {
      if (!json) {
        if (response.body) response.body.cancel().catch(function () {});
        return response;
      }
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (result) {
      clearTimeout(timer);
      return result;
    }, function (failure) {
      clearTimeout(timer);
      if (timedOut) throw new Error('请求超过 6 秒');
      throw failure;
    });
  }

  function ipIpip() {
    return request('https://myip.ipip.net/json', {}, true).then(function (data) {
      if (data.ret !== 'ok' || !data.data || !data.data.ip) throw new Error('IP 接口返回格式异常');
      var location = data.data.location || [];
      return {ip: data.data.ip, country: location[0], region: location[1], city: location[2], isp: location[4], source: 'ipip.net'};
    });
  }
  function ipSb() {
    return request('https://api.ip.sb/geoip', {}, true).then(function (data) {
      if (!data.ip) throw new Error('IP 接口返回格式异常');
      var geo = '';
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') geo = data.latitude + ', ' + data.longitude;
      return {ip: data.ip, country: data.country, region: data.region, city: data.city, isp: data.isp || data.organization, timezone: data.timezone, geo: geo, source: 'ip.sb'};
    });
  }
  $('btnIp').addEventListener('click', function () {
    var button = this;
    if (button.disabled) return;
    var box = $('ipResult');
    clearError(box);
    box.style.display = '';
    ['rIp', 'rCountry', 'rCity', 'rOrg', 'rTz', 'rGeo'].forEach(function (id) { setText(id, '—'); });
    $('ipNote').textContent = '正在查询第三方 IP 服务…';
    busy(button, true, '查询中…');
    ipIpip().catch(ipSb).then(function (data) {
      setText('rIp', data.ip); setText('rCountry', data.country);
      setText('rCity', [data.region, data.city].filter(Boolean).join(' · '));
      setText('rOrg', data.isp); setText('rTz', data.timezone); setText('rGeo', data.geo);
      $('ipNote').textContent = '数据来源：' + data.source + '。归属地仅供参考；第三方服务可看到你的出口 IP。';
    }).catch(function () {
      error(box, '两个 IP 查询服务均不可用或请求超时。请检查网络后重试。');
      $('ipNote').textContent = '本次查询未成功，不显示上次结果。';
    }).then(function () { busy(button, false, '查询我的 IP'); });
  });

  function doh(host, type) {
    var query = '?name=' + encodeURIComponent(host) + '&type=' + encodeURIComponent(type);
    var providers = [
      {name: '阿里 DoH', url: 'https://dns.alidns.com/resolve' + query},
      {name: '腾讯 DoH', url: 'https://doh.pub/dns-query' + query},
      {name: 'Cloudflare DoH', url: 'https://cloudflare-dns.com/dns-query' + query}
    ];
    function attempt(index) {
      if (index >= providers.length) return Promise.reject(new Error('所有 DNS 服务均不可用或超时'));
      var provider = providers[index];
      return request(provider.url, {headers: {Accept: 'application/dns-json'}}, true).then(function (data) {
        if (typeof data.Status !== 'number') throw new Error('DNS 返回格式异常');
        if (data.Answer !== undefined && !Array.isArray(data.Answer)) throw new Error('DNS Answer 格式异常');
        return {data: data, provider: provider.name};
      }).catch(function () { return attempt(index + 1); });
    }
    return attempt(0);
  }
  function hostFromInput(input) {
    var text = input.trim();
    if (!text) throw new Error('请输入域名');
    if (!/^https?:\/\//i.test(text)) text = 'https://' + text;
    var url = new URL(text);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error('请输入域名或不含账号密码的网址');
    var host = url.hostname.replace(/\.$/, '');
    if (host.length > 253 || host.indexOf('.') < 0) throw new Error('域名格式不正确');
    host.split('.').forEach(function (label) {
      if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) throw new Error('域名格式不正确');
    });
    return host;
  }
  var typeNames = {1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA'};
  $('btnDns').addEventListener('click', function () {
    var button = this;
    if (button.disabled) return;
    var box = $('dnsResult');
    clearError(box);
    $('dnsBody').textContent = '';
    $('dnsNote').textContent = '';
    var host;
    try { host = hostFromInput($('dnsHost').value); } catch (failure) { error(box, '请输入有效域名，例如 example.com；请勿包含账号或密码。'); return; }
    var type = $('dnsType').value;
    box.style.display = '';
    busy(button, true, '解析中…');
    doh(host, type).then(function (result) {
      var data = result.data;
      var answers = data.Answer || [];
      var status = String(data.Status);
      if (data.Status === 0) status = 'NOERROR';
      if (data.Status === 3) status = 'NXDOMAIN（域名不存在）';
      answers.forEach(function (answer) {
        var row = document.createElement('tr');
        var typeName = typeNames[answer.type] || 'TYPE' + answer.type;
        var ttl = answer.TTL;
        if (ttl === undefined) ttl = '—';
        [typeName, ttl, answer.data].forEach(function (value) {
          var cell = document.createElement('td');
          cell.textContent = String(value);
          row.appendChild(cell);
        });
        $('dnsBody').appendChild(row);
      });
      if (!answers.length) {
        var row = document.createElement('tr');
        var cell = document.createElement('td');
        cell.colSpan = 3;
        cell.textContent = '本次未返回 ' + type + ' 记录。';
        row.appendChild(cell); $('dnsBody').appendChild(row);
      }
      $('dnsNote').textContent = '查询：' + host + ' · 数据来源：' + result.provider + ' · 状态：' + status + '。与设备系统 DNS 结果可能不同。';
    }).catch(function () { error(box, 'DNS 查询服务均不可用或超时，请稍后重试。'); })
      .then(function () { busy(button, false, '解析'); });
  });

  $('btnSpeed').addEventListener('click', function () {
    var button = this;
    if (button.disabled) return;
    var box = $('speedResult');
    clearError(box);
    ['sDns', 'sTtfb', 'sTotal', 'sStatus'].forEach(function (id) { setText(id, '—'); });
    var text = $('speedUrl').value.trim();
    if (!text) { error(box, '请输入要测试的网址。'); return; }
    if (!/^https?:\/\//i.test(text)) text = 'https://' + text;
    var url;
    try {
      url = new URL(text);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error('invalid');
      if (location.protocol === 'https:' && url.protocol !== 'https:') { error(box, 'HTTPS 页面无法可靠测试 HTTP 地址，请使用 HTTPS 地址。'); return; }
    } catch (failure) { error(box, '请输入有效的 HTTP / HTTPS 网址，不要包含账号或密码。'); return; }
    box.style.display = '';
    busy(button, true, '测试中…');
    var totalStart = performance.now();
    var dnsStart = performance.now();
    doh(url.hostname, 'A').then(function () {
      setText('sDns', Math.round(performance.now() - dnsStart) + ' ms');
    }).catch(function () { setText('sDns', 'DoH 查询失败'); }).then(function () {
      var start = performance.now();
      return request(url.href, {mode: 'no-cors', redirect: 'follow'}, false).then(function (response) {
        setText('sTtfb', Math.round(performance.now() - start) + ' ms');
        setText('sTotal', Math.round(performance.now() - totalStart) + ' ms');
        if (response.type === 'opaque' || response.status === 0) {
          setText('sStatus', '不透明响应：HTTP 状态不可见');
        } else {
          setText('sStatus', 'HTTP ' + response.status);
        }
      });
    }).catch(function () {
      error(box, '请求失败或超过 6 秒；可能与网络、浏览器策略或目标站点有关。');
      setText('sStatus', '无法判断目标 HTTP 状态');
    }).then(function () { busy(button, false, '开始测试'); });
  });

  [['dnsHost', 'btnDns'], ['speedUrl', 'btnSpeed']].forEach(function (pair) {
    $(pair[0]).addEventListener('keydown', function (event) {
      if (event.key === 'Enter') $(pair[1]).click();
    });
  });
})();
