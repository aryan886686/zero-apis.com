const { URL } = require('url');

function testGateway(upstreamUrlStr, paramName, query) {
  let paramValue = query[paramName];
  let finalUpstreamStr = upstreamUrlStr;

  if (paramName && finalUpstreamStr.includes(`{${paramName}}`) && paramValue) {
    finalUpstreamStr = finalUpstreamStr.replace(`{${paramName}}`, encodeURIComponent(paramValue));
  }
  
  const upstreamUrl = new URL(finalUpstreamStr);

  if (paramName && !upstreamUrlStr.includes(`{${paramName}}`) && paramValue) {
    upstreamUrl.searchParams.set(paramName, paramValue);
  }

  Object.entries(query).forEach(([k, v]) => {
    if (k !== 'key' && k !== paramName) {
      upstreamUrl.searchParams.set(k, v);
    }
  });

  return upstreamUrl.toString();
}

console.log(testGateway("http://example.com/api", "number", { key: "abc", number: "12345" }));
console.log(testGateway("http://example.com/api?mobile=", "number", { key: "abc", number: "12345" }));
console.log(testGateway("http://example.com/api?mobile={number}", "number", { key: "abc", number: "12345" }));
console.log(testGateway("http://example.com/api.php", "", { key: "abc", number: "12345" }));
