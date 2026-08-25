import type { PrismaClient } from "@prisma/client";

const HISTORY_OF_GATKA_HTML = `
<p>ਗਤਕਾ ਸਿੱਖ ਧਰਮ ਅੰਦਰ ਸ਼ਸਤ੍ਰ ਵਿਦਿਆ ਨੂੰ ਗਤਕਾ ਨਾਮ ਨਾਲ ਵੀ ਪੁਕਾਰਿਆ ਜਾਂਦਾ ਹੈ ਪਰ ਗਤਕਾ ਇਕ ਅੱਲਗ ਸ਼ਸਤ੍ਰ ਹੈ। ਜੋਕਿ ਲੰਬਾਈ ਵਿੱਚ ੩੯ ਇੰਚ ਦੀ ਸੋਟੀ,ਜਿਸ ਉਪਰ ਕਪੜੇ ਦੀ ਜਾਂ ਸੁਤੀ ਨਵਾਰ, ਚਮੜਾ ਜਾਂ ਫੇਰ ਪਲਾਸਟਿਕ ਕਵਰ ਕੀਤਾ ਹੁੰਦਾ ਹੈ ਅਤੇ ਮੁੱਠ ਉਪਰ ਹੱਥ ਤੋਂ ਬਚਾਅ ਲਈ ਇਕ ਗੋਲ ਲਾਟੂ ਤੇ ਹੇਠਾਂ ਇਕ ਪਰਜ ਲਗੀ ਹੁੰਦੀ ਹੈ,ਜਿਸ ਉਪਰ ਕਪੜੇ ਜਾਂ ਚਮੜੇ ਦਾ ਕਵਰ ਲਗਿਆ ਹੁੰਦਾ ਹੈ।</p>
<p>ਗਤਕਾ ਸ਼ਸਤ੍ਰ ਨੂੰ ਭਗਉਤਾ,ਆਸਾ, ਠੇਗਾ, ਲਗੁੜ, ਮੁਦਗਰ, ਡੰਡ ,ਮੁਤ ਹਿਰਾ , ਫਾਰਸੀ ਵਿੱਚ ਖੁਤਕਾ ਤੇ ਤੁਰਕੀ ਵਿਚ ਕੁਤਕੇ ਦੇ ਨਾਮ ਨਾਲ ਜਾਣਿਆ ਜਾਂਦਾ ਹੈ। ਸਿੱਖ ਧਰਮ ਅੰਦਰ ਮੀਰੀ - ਪੀਰੀ ਦੀਆਂ ਕਿਰਪਾਨਾਂ ਧਾਰਨ ਕਰਕੇ ਜਦੋਂ ਛੇਂਵੇ ਪਾਤਿਸ਼ਾਹ ਜੀ ਨੇ ਸ਼ਸਤ੍ਰ ਵਿੱਦਿਆ ਹਰੇਕ ਸਿੱਖ ਲਈ ਜਰੂਰੀ ਕਰਾਰ ਦਿੱਤੀ ਤਾਂ ਗਤਕਾ ਖੇਡ ਵੀ ਉਸੀ ਸਮੇਂ ਸਾਮਿਲ ਕੀਤੀ ਗਈ। ਇਸ ਸ਼ਸਤ੍ਰ ਨਾਲ ਹੀ ਸ਼ਸਤ੍ਰ ਵਿਦਿਆ ਦੀ ਸਿਖਲਾਈ ਸ਼ੁਰੂ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਸ਼ੁਰੂਆਤ ਕੀਤੀ ਜਾਂਦੀ ਹੈ।</p>
<p>ਇਤਿਹਾਸ ਵਿਚ ਜਿਕਰ ਆਉਂਦਾ ਹੈ ਕਿ ਕੁੱਝ ਸਮਾਂ ਪਹਿਲਾਂ ਤੱਕ ਗਤਕਾ ਖੇਡ ਦੇ ਬਹੁਤ ਉੱਚ ਕੋਈ ਦੇ ਖਿਡਾਰੀ ਹੁੰਦੇ ਸਨ,ਜਿਹੜੇ ਇਕ ਚਾਰ ਪਾਵਿਆਂ ਵਾਲੇ ਮੰਜੇ ਹੇਠ ਇੱਕ ਕਾਂ ( Crow ) ਨੂੰ ਵਾੜ ਦਿੰਦੇ ਸਨ ਤੇ ਫੇਰ ਗਤਕਾ ਸ਼ਸਤ੍ਰ ਨਾਲ ਅਜਿਹੀ ਫੁਰਤੀ ਨਾਲ ਵਾਰ ਕਰਦੇ ਸਨ ਕਿ ਕਾਂ ਵਰਗਾ ਚੁਸਤ ਚਲਾਕ ਪੰਛੀ ਉਸ ਮੰਜੇ ਹੇਠੋਂ ਬਾਹਰ ਨਹੀਂ ਸੀ ਨਿਕਲ ਸਕਦਾ। ਵੱਖੋ - ਵੱਖ ਅਖਾੜਿਆਂ ਅੰਦਰ ਇਸ ਖੇਡ ਦੇ ਵੱਖ - ਵੱਖ ਵਾਰ ਦੱਸੇ ਜਾਂਦੇ ਹਨ ਕਹਿਣ ਦਾ ਭਾਵ ਕਿ ਕੋਈ ੧੬, ਕੋਈ ੪੮, ਕੋਈ ੮੪ ਤੇ ਕੋਈ ੧੦੧ ਅਤੇ ਕੋਈ ਇਸਤੋਂ ਵੱਧ ਦੇ ਵਾਰ ਵੀ ਦਸਦੇ ਹਨ ਪਰ ਗੁਰੂ ਕੀਆਂ ਲਾਡਲੀਆਂ ਫੌਜਾਂ ਨਿਹੰਗ ਸਿੰਘ ਇਸਦੇ ਸਿਰਫ਼ ਦੋ ਵਾਰ ਰੋਕਣਾ ਤੇ ਠੋਕਣਾ ਹੀ ਦਸਦੇ ਹਨ। ਵਿਦਵਾਨਾਂ ਦੀ ਨਜ਼ਰ ਵਿਚ ਇਸਦੇ ਤਿੰਨ ਵਾਰ ਹੋਰ ਹਨ,ਜਿਵੇਂ ੧. ਸਾਂਝਾ, ੨. ਸਾਂਵਾ ਤੇ ੩. ਸਪੱਸ਼ਟ ਭਾਵ ਸਾਂਝਾ ਵਾਰ ਉਹ ਜੋ ਦੋਂਵੇ ਖਿਡਾਰੀ ਇੱਕਠੇ ਇਕ ਦੂਜੇ ਨੂੰ ਇੱਕੋ ਸਮੇਂ ਮਾਰਨ, ਦੂਸਰਾ ਸਾਂਵਾਂ ਵਾਰ ਉਹ ਜੋ ਇਕ ਖਿਡਾਰੀ ਵਾਰ ਮਾਰੇ ਤੇ ਦੂਸਰਾ ਖਿਡਾਰੀ ਉਸਦੇ ਜਵਾਬ ਵਿਚ ਵਾਰ ਮਾਰੇ ਤੇ ਤੀਜਾ ਸਪਸ਼ਟ ਵਾਰ ਉਹ ਜਿਹੜਾ ਇਕ ਖਿਡਾਰੀ ਵਾਰ ਮਾਰ ਦੇਵੇ ਤੇ ਦੂਸਰਾ ਮਾਰ ਨਾ ਸਕੇ। ਇਸ ਤਰ੍ਹਾਂ ਇਨ੍ਹਾਂ ਤਿੰਨਾਂ ਵਾਰਾਂ ਨੂੰ ਧਿਆਨ ਵਿੱਚ ਰੱਖਦੇ ਹੋਏ ਖਿਡਾਰੀ ਇਸ ਖੇਡ ਨੂੰ ਖੇਡਦੇ ਹਨ। ਇੰਝ ਹੀ ਗਤਕਾ ਸੋਟੀ ਤੇ ਤਿੰਨ ਗੁਣ ਮੰਨੇ ਜਾਂਦੇ ਹਨ,੧. ਝਾਰ, ੨. ਵਾਰ ੩. ਮਾਰ ਭਾਵ ਝਾਰ - ਮੁੱਠ ਤੋਂ ਬਚਾਉਂਦੀ ਹੈ,ਵਾਰ - ਰੋਕਦੀ ਹੈ,ਮਾਰ - ਮਾਰਦੀ ਹੈ।</p>
<p>ਕੁਝ ਸਮਾਂ ਪਹਿਲਾਂ ਤੱਕ ਗਤਕਾ ਖੇਡ ਤਕਰੀਬਨ ਆਲੋਪ ਹੋਣ ਦੇ ਕੰਢੇ ਪਹੁੰਚ ਚੁੱਕੀ ਸੀ ਪਰ ਗਤਕਾ ਫੈਡਰਸ਼ਨ ਆਫ਼ ਇੰਡੀਆ ( ਰਜਿ.) ਦੇ ਕਿਤੇ ਜਾ ਰਹੇ ਉਪਰਾਲਿਆਂ ਤੇ ਕੋਸਿਸ਼ਾਂ ਸਦਕਾ ਗਤਕਾ ਇਕ ਰਾਸ਼ਟਰੀ ਖੇਡ ਬਣ ਚੁੱਕੀ ਹੈ।</p>
`.trim();

const HISTORY_OF_ASSOCIATION_HTML = `
<p>ਪੰਜਾਬ ਗਤਕਾ ਐਸੋਸੀਏਸ਼ਨ ਦੀ ਨੀਂਹ ਮਿਤੀ 29.11.2008 ਨੂੰ ਸ੍ਰੀ ਆਨੰਦਪੁਰ ਸਾਹਿਬ ਵਿਖੇ ਰੱਖੀ ਗਈ। ਉਸ ਸਮੇਂ ਤਖ਼ਤ ਸ੍ਰੀ ਕੇਸਗੜ੍ਹ ਸਾਹਿਬ ਦੇ ਜੱਥੇਦਾਰ ਗਿਆਨੀ ਤਰਲੋਚਨ ਸਿੰਘ ਜੀ ਦੀ ਹਾਜਰੀ ਵਿੱਚ ਸਮੂਹ ਗਤਕਾ ਪ੍ਰੇਮੀਆਂ ਅਤੇ ਜਥੇਦਾਰਾਂ ਦੀ ਇੱਕ ਮੀਟਿੰਗ ਹੋਈ , ਜਿਸ ਵਿੱਚ ਸਰਬ ਸੰਮਤੀ ਨਾਲ਼ ਸ. ਹਰਚਰਨ ਸਿੰਘ ਭੁੱਲਰ ਨੂੰ ਐਸੋਸੀਏਸ਼ਨ ਦਾ ਪ੍ਰਧਾਨ ਅਤੇ ਸ. ਹਰਜੀਤ ਸਿਘ ਨੂੰ ਬਤੌਰ ਜਨਰਲ ਸਕੱਤਰ ਨਿਯੁਕਤ ਕੀਤਾ ਗਿਆ।</p>
<p>ਇਸ ਤੋਂ ਬਾਅਦ ਸਮੁੱਚੀ ਸੰਗਤ ਦੇ ਸਹਿਯੋਗ ਨਾਲ ਰਜਿਸਟਰ ਕਰਵਾਇਆ ਗਿਆ। ਐਸੋਸੀਏਸ਼ਨ ਦੇ ਸਮੂਹ ਮੈਂਬਰਾਂ ਅਤੇ ਸੰਗਤ ਦੇ ਸਹਿਯੋਗ ਨਾਲ ਐਸੋਸੀਏਸ਼ਨ ਦਿਨ ਦੁੱਗਣੀ ਰਾਤ ਚੌਗਣੀ ਤਰੱਕੀ ਕਰ ਰਹੀ ਹੈ। ਮਿਤੀ 12.12.2015 ਨੂੰ ਸ. ਬਲਜਿੰਦਰ ਸਿੰਘ ਤੂਰ ਨੂੰ ਪੰਜਾਬ ਗਤਕਾ ਐਸੋਸੀਏਸ਼ਨ ਦਾ ਜਨਰਲ ਸਕੱਤਰ ਥਾਪਿਆ ਗਿਆ, ਜੋ ਕਿ ਮੌਜੂਦਾ ਸਮੇਂ ਤੱਕ ਆਪਣੀਆਂ ਸੇਵਾਵਾਂ ਨਿਭਾ ਰਹੇ ਹਨ। ਮਿਤੀ 07.12.2017 ਤੱਕ ਸ. ਹਰਚਰਨ ਸਿੰਘ ਭੁੱਲਰ ਵੱਲੋਂ ਸ਼ਾਨਦਾਰ 2 ਟਰਮਜ਼ ਪੂਰੀਆਂ ਕੀਤੀਆਂ ਗਈਆਂ, ਉਪਰੰਤ ਸ. ਰਜਿੰਦਰ ਸਿੰਘ ਸੋਹਲ ਨੂੰ ਪ੍ਰਧਾਨ ਥਾਪਿਆ ਗਿਆ।</p>
<p>ਮੌਜੂਦਾ ਸਮੇਂ ਤੱਕ ਐਸੋਸੀਏਸ਼ਨ ਵੱਲੋਂ 6 ਰਾਜ ਪੱਧਰੀ ਚੈਂਪੀਅਨਸ਼ਿਪ ਕਰਵਾਈਆਂ ਜਾ ਚੁੱਕੀਆਂ ਹਨ। ਸਟੇਟ ਸਪੋਰਟਸ ਕੌਂਸਲ ਅਤੇ ਪੰਜਾਬ ਓਲੰਪਿਕ ਐਸੋਸੀਏਸ਼ਨ ਵੱਲੋਂ ਐਸੋਸੀਏਸ਼ਨ ਨੂੰ ਮਾਨਤਾ ਦਿੱਤੀ ਗਈ ਹੈ। ਸੈਂਕੜੇ ਵਿਰਸਾ ਸੰਭਾਲ ਗੱਤਕਾ ਮੁਕਾਬਲੇ ਅਤੇ ਖਿਡਾਰੀਆਂ ਅਤੇ ਰੈਫਰੀਆਂ ਦੀ ਟ੍ਰੇਨਿੰਗ ਲਈ ਦਰਜਨਾਂ ਕੈਂਪ ਲਗਾਏ ਜਾ ਚੁੱਕੇ ਹਨ।</p>
<p>ਪੰਜਾਬ ਗੱਤਕਾ ਐਸੋਸੀਏਸ਼ਨ ਦੇ ਉਪਰਾਲੇ ਸਦਕਾ ਪੰਜਾਬ ਸਕੂਲ ਸਿੱਖਿਆ ਵਿਭਾਗ ਅਤੇ ਪੰਜਾਬ ਵਿੱਚ ਸਥਾਪਤ ਯੂਨੀਵਰਸਿਟੀਆਂ, ਕਾਲਜਾਂ ਵਿਚ ਗੱਤਕੇ ਨੂੰ ਖੇਡ ਵਜੋਂ ਮਾਨਤਾ ਦਿੱਤੀ ਗਈ ਹੈ।</p>
<p>ਗੁਰੂ ਸਾਹਿਬਾਨ ਦੀ ਸਿੱਖਿਆ ਤੇ ਚਲਦਿਆਂ ਲੜਕੀਆਂ ਨੂੰ ਲੜਕਿਆਂ ਦੇ ਬਰਾਬਰ ਦਰਜਾ ਦੇਣ ਲਈ ਵੱਖਰੇ ਤੌਰ ਤੇ "ਮਾਤਾ ਭਾਗ ਕੌਰ" ਗਤਕਾ ਕੱਪ (ਕੇਵਲ ਲੜਕੀਆਂ ਲਈ) ਕਰਵਾਇਆ ਜਾਂਦਾ ਹੈ। ਪੰਜਾਬੀ ਜਾਗਰਣ ਨਾਲ ਮਿਲ ਕੇ ਕਰਵਾਏ ਗਤਕਾ ਕੱਪ ਵੀ ਇਸ ਖੇਡ ਨੂੰ ਬੁਲੰਦੀਆਂ ਤੱਕ ਲੈ ਕੇ ਜਾਣ ਵਿੱਚ ਸਹਾਈ ਹੋਏ ਹਨ।</p>
<p>ਪੰਜਾਬ ਗੱਤਕਾ ਐਸੋਸੀਏਸ਼ਨ, ਗੱਤਕਾ ਫੈਡਰੇਸ਼ਨ ਆਫ ਇੰਡੀਆ ਦੀ ਅਗਵਾਈ ਹੇਠ ਕੰਮ ਕਰ ਰਹੀ ਹੈ।</p>
<p>ਐਸੋਸੀਏਸ਼ਨ ਦਾ ਮੁੱਖ ਉਦੇਸ਼ ਜਿੱਥੇ ਖਿਡਾਰੀਆਂ, ਰੈਫਰੀਆਂ, ਗਤਕਾ ਕੋਚਾਂ ਨੂੰ ਬਣਦਾ ਮਾਣ ਸਤਿਕਾਰ ਦਿਵਾਉਣਾ ਹੈ, ਉੱਥੇ ਹੀ ਇਹ ਇਸ ਖੇਡ ਨੂੰ ਬਾਕੀ ਖੇਡਾਂ ਦੇ ਬਰਾਬਰ ਮਾਣ ਦਿਵਾਉਣ ਲਈ ਵੀ ਯਤਨਸ਼ੀਲ ਹੈ।</p>
`.trim();

const DRESS_CODE_HTML = `
<p>ਟੀਮ/ਪ੍ਰਤੀਯੋਗੀ ਨੂੰ ਸਪੋਰਟਸ ਪ੍ਰਤੀਯੋਗਤਾ ਲਈ ਨਿਰਧਾਰਤ ਡਰੈਸ ਪਹਿਨਣੀ ਜ਼ਰੂਰੀ ਹੈ, ਪਰ ਵਿਰਸਾ ਸੰਭਾਲ ਗੱਤਕਾ ਮੁਕਾਬਲੇ ਦੇ ਦੌਰਾਨ, ਪ੍ਰਤੀਭਾਗੀਆਂ ਨੂੰ ਰਵਾਇਤੀ ਕੱਪੜੇ (ਬਾਣਾ) ਪਹਿਨਣੇ ਚਾਹੀਦੇ ਹਨ।</p>
<h4>1. ਕੱਪੜੇ :</h4>
<p>ਪ੍ਰਤੀਯੋਗੀ ਲਈ ਹਲਕੇ ਸਪੋਰਟਸ ਬੂਟ, ਜੁਰਾਬਾਂ, ਟੀ-ਸ਼ਰਟ, ਲੋਅਰ ਜਾਂਟਰੈਕ ਸੂਟ ਪਹਿਨਣਾ ਜ਼ਰੂਰੀਹੈ। ਖਿਡਾਰੀ ਹਾਫ਼ ਪੈਂਟ, ਕੈਪਰੀ ਜਾਂ ਨਿੱਕਰ ਨਹੀਂ ਪਾਸਕਦਾ। ਮੁਕਾਬਲੇ ਦੇ ਦੌਰਾਨ ਖਿਡਾਰੀਆਂ ਨੂੰ ਲਾਲ ਜਾਂ ਨੀਲੇ ਰੰਗ ਦੀ ਜਾਕਟ ਜਾਂ ਚੈਸਟ ਗਾਰਡ ਪਾਉਣ ਲਈ ਦਿੱਤਾ ਜਾਵੇਗਾ। ਜਿਸ ਉਤੇ ਪ੍ਰਤੀਯੋਗਤਾ ਜਾਂ ਆਯੋਜਕਾਂ ਦੁਆਰਾ ਲੋਗੋ ਲਗਾਇਆ ਜਾ ਸਕਦਾ ਹੈ। ਲੱਕ ਉਪਰ ਸਪੱਸ਼ਟ ਤੌਰ ਤੇ ਬੈਲਟ ਲਾਈਨ ਨੂੰ ਦਰਸਾਉਣ ਲਈ ਇਕ ਕਪੜਾ (ਕਮਰਕੱਸਾ) ਬੰਨਿਆ ਜਾਵੇਗਾ। ਜੋ ਕਿ ਖਿਡਾਰੀ ਆਪਣਾਵੀ ਵਰਤ ਸਕਦਾ ਹੈ ਅਤੇ ਆਯੋਜਕ ਵੀ ਦੇ ਸਕਦੇ ਹਨ।</p>
<h4>2. ਸੁਰੱਖਿਆ :</h4>
<p>2.1 ਹੈੱਡ ਗਾਰਡ ਲਾਜ਼ਮੀ ਹੋਵੇਗਾ। ਜੇਕਰ ਕੋਈ ਖਿਡਾਰੀ ਦਸਤਾਰ/ਪਗੜੀ/ ਦੁਮਾਲਾ ਸਜਾਉਂਦਾ ਹੈ ਤਾਂ ਉਹ ਉਸ ਉੱਪਰ ਹੀ ਫੇਸ-ਗਾਰਡ ਪਾ ਸਕਦਾ ਹੈ।</p>
<p>2.2 ਦੁਮਾਲਾ ਜਾਂ ਦਸਤਾਰ ਉਤਾਰਨ ਦੀ ਜ਼ਰੂਰਤ ਨਹੀਂ।</p>
<p>2.3 ਇਕ ਖਿਡਾਰੀ ਮੁਕਾਬਲੇ/ਸ਼ਸਤਰਾਂ ਦੇ ਪ੍ਰਦਰਸ਼ਨ ਦੇ ਸਮੇਂ ਐਨਕ ਲਗਾ ਸਕਦਾ ਹੈ।</p>
<p>2.4 ਇਕ ਖਿਡਾਰੀ ਰਬੜ/ਚਮੜੇ ਦੇ ਦਸਤਾਨੇ ਪਹਿਨ ਸਕਦਾ ਹੈ(ਆਯੋਜਕਾਂਦੁਆਰਾ ਮੁਹੱਈਆ ਨਹੀਂ ਕੀਤੇ ਜਾਂਦੇ।</p>
<p>2.5 ਸਾਰੇ ਪੁਰਸ਼ ਖਿਡਾਰੀਆਂ ਲਈ L-guard ਪਹਿਨਣਾ ਜ਼ਰੂਰੀ ਹੈ।(ਆਯੋਜਕਾਂ ਦੁਆਰਾ ਨਹੀਂ ਦਿੱਤਾ ਜਾਵੇਗਾ।</p>
<p>2.6 ਇਕ ਖਿਡਾਰੀ Leg-guard, Arm guard, elbow guard, knee guard ਪਹਿਨ ਸਕਦਾ ਹੈ। ਆਯੋਜਕਾਂ ਦੁਆਰਾ ਮੁਹੱਈਆ ਨਹੀਂਕਰਾਇਆ ਜਾਂਦਾ) ਜੋ ਵਿਰੋਧੀ ਨੂੰ ਨੁਕਸਾਨ ਨਾ ਪਹੁੰਚਾ ਸਕੇ।</p>
<h4>3. ਮਨਾਹੀ ਵਾਲੀਆਂ ਚੀਜ਼ਾਂ :</h4>
<p>3.1 ਕੋਈ ਵੀ ਖਿਡਾਰੀ ਕੜਾ, ਕੰਘਾ ਅਤੇ ਕ੍ਰਿਪਾਨ ਤੋਂ ਇਲਾਵਾ ਕੋਈ ਹੋਰ ਵਸਤੂ ਨਹੀਂ ਪਹਿਨ ਸਕਦਾ।</p>
<p>3.2 ਕਿਰਪਾਨ/ਸ੍ਰੀ ਸਾਹਿਬ ਜੇ ਕਿਸੇ ਦੀ ਖਿਡਾਰੀ ਵੱਲੋਂ ਪਹਿਨੀ ਜਾਂਦੀ ਹੈ ਤਾਂ ਉਹ 6 ਇੰਚ ਤੋਂ ਵੱਧ ਨਹੀਂ ਹੋਣੀ ਚਾਹੀਦੀ।</p>
<p>3.3 ਮੁਕਾਬਲੇ ਦੌਰਾਨ ਕਿਰਪਾਨ/ਸ੍ਰੀ ਸਾਹਿਬ ਦੀ ਦੁਰਵਰਤੋਂ ਦੇ ਨਤੀਜੇਵਜੋਂ ਖਿਡਾਰੀਵਿਰੁੱਧ ਕਾਰਵਾਈ ਹੋਵੇਗੀ।</p>
<p>3.4 ਕੋਈ ਖਿਡਾਰੀ ਕਿਸੇ ਵੀ ਕਿਸਮ ਦੀ ਕੋਈ ਚੀਜ਼, ਗਹਿਣੇ ਆਦਿ ਨਹੀਂ ਪਹਿਨ ਸਕਦਾਜੋ ਵਿਰੋਧੀ ਦੇ ਲਈ ਨੁਕਸਾਨ ਦੇਹ ਸਿੱਧ ਹੋਵੇ ਜਾਂ ਖੁਦ ਲਈਅਸੁਵਿਧਾ ਦਾ ਕਾਰਨ ਬਣੇ। ਖੇਡਣ ਸਮੇਂ ਖਿਡਾਰੀ ਦਾ ਪਹਿਰਾਵਾ ਨਿਰਧਾਰਤ ਨਿਯਮਾਂ ਅਨੁਸਾਰ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।</p>
<p>3.5 ਟੀਮ/ਪ੍ਰਤੀਯੋਗੀ ਲਈ ਸੰਬੰਧਿਤ ਗਤਕਾ ਫੈਡਰੇਸ਼ਨ/ਐਸੋਸੀਏਸ਼ਨ ਅਤੇ ਗਤਕਾ ਈਵੈਂਟ ਦੇ ਨਿਰਧਾਰਿਤ ਲੋਗੋ ਅਤੇ ਪਹਿਰਾਵੇ/ਪਹਿਰਾਵੇ ਤੇਸਪਾਂਸਰ ਦੇ ਨਾਂ ਵਾਲੀ ਡਰੈੱਸ ਲਾਜ਼ਮੀ ਹੈ। ਪਛਾਣ ਕਾਰਡ ਦੇ ਬਗੈਰ ਕੋਈ ਵੀ ਖਿਡਾਰੀ ਕਿਸੇ ਵੀ ਮੁਕਾਬਲੇ ਵਿਚਹਿੱਸਾ ਨਹੀਂ ਲੈ ਸਕਦਾ।</p>
<h4>4. ਆਫੀਸ਼ੀਅਲਜ਼ ਲਈ ਡਰੈਸ (ਸਪੋਰਟਸ ਟੂਰਨਾਮੈਂਟ) :</h4>
<p>4.1 ਗਤਕਾ ਸਪੋਰਟਸ ਮੁਕਾਬਲੇ ਦੌਰਾਨ ਸਾਰੇ ਅਧਿਕਾਰੀ ਪੁਰਸ਼ ਅਤੇ ਇਸਤਰੀਆਂ) ਹਲਕੇ ਸਲੇਟੀ ਰੰਗ ਦੀ ਪੈਂਟ, ਵਾਈਟ ਕਮੀਜ਼, ਸਪੋਰਟਸਜੁੱਤੇ ਅਤੇ ਨੇਵੀ ਬਲੂ ਪਗੜੀ/ਕੈਪ ਪਹਿਨਣਗੇ। ਪਰ ਉਹ ਵਿਰਸਾ ਸੰਭਾਲ, ਗਤਕਾ ਟੂਰਨਾਮੈਂਟ ਦੇ ਦੌਰਾਨ ਪਰੰਪਰਾਗਤ ਪਹਿਰਾਵੇਪਹਿਨਣਗੇ।</p>
`.trim();

const TYPES_OF_TOURNAMENTS_HTML = `
<h2>Tournament Age Classifications</h2>
<ul>
  <li>Sub-Junior — U-14 (ਸਬ-ਜੂਨੀਅਰ)</li>
  <li>Junior — U-17 A (ਜੂਨੀਅਰ)</li>
  <li>Senior — U-22 (ਸੀਨੀਅਰ)</li>
  <li>Senior — U-25 (ਸੀਨੀਅਰ)</li>
  <li>Veteran — 28+ Years (ਵੈਟਰਨ)</li>
</ul>
<h2>State &amp; International Level Events</h2>
<ul>
  <li>Block &amp; District Level — ਬਲਾਕ ਅਤੇ ਜ਼ਿਲ੍ਹਾ ਪੱਧਰ ਦੇ ਗਤਕਾ ਮੁਕਾਬਲੇ — Sub-Junior, Junior &amp; Senior</li>
  <li>Inter-State Championships — ਅੰਤਰ-ਰਾਜਾ ਗਤਕਾ ਟੂਰਨਾਮੈਂਟ — Sub-Junior, Junior &amp; Senior</li>
  <li>Asian Gatka Performance — ਏਸ਼ੀਅਨ ਗਤਕਾ ਪ੍ਰਦਰਸ਼ਨ — Junior &amp; Senior</li>
  <li>Commonwealth Gatka — ਕਾਨਵੈਲਥ ਗਤਕਾ ਮੁਕਾਬਲੇ — Junior &amp; Senior</li>
  <li>World Gatka Tournament — ਵਰਲਡ ਗਤਕਾ ਮੁਕਾਬਲੇ — Junior &amp; Senior</li>
  <li>Veteran Gatka (State/National) — ਵੈਟਰਨ ਗਤਕਾ ਮੁਕਾਬਲੇ — State &amp; National Level</li>
  <li>Virsa Sambhal Competitions — ਵਿਰਸਾ ਸੰਭਾਲ ਮੁਕਾਬਲੇ — District, State &amp; National</li>
</ul>
<h2>SGFI &amp; School Level</h2>
<p>School Games Federation of India (SGFI) and Education Department competitions for Sub-Junior, Junior, and Senior levels.</p>
<ul>
  <li>Block &amp; District Level (School Games)</li>
  <li>Inter-District School Games</li>
  <li>Inter-State School Championships</li>
  <li>Asian School Gatka Competitions</li>
  <li>Commonwealth School Games</li>
  <li>World School Gatka Championships</li>
</ul>
<h2>University Level</h2>
<ul>
  <li>Inter-College Competitions — ਅੰਤਰ ਕਾਲਜਗਤਕਾ ਮੁਕਾਬਲੇ</li>
  <li>Inter-University Championships — ਅੰਤਰ ਯੂਨੀਵਰਸਿਟੀ ਗਤਕਾ ਮੁਕਾਬਲੇ</li>
  <li>World University Games — ਵਰਲਡ ਯੂਨੀਵਰਸਿਟੀਗਤਕਾ ਮੁਕਾਬਲੇ</li>
  <li>1O Charitable Trust National Cup — ਨੈਸ਼ਨਲਓ ਗਤਕਾ ਕੱਪ (Seechewal)</li>
</ul>
`.trim();

const OUR_ACHIEVEMENTS_INTRO =
  "ਸੋਟੀ ਦੀ ਲੜਾਈ ਇੱਕ ਪ੍ਰਾਚੀਨ ਭਾਰਤੀ ਜੰਗਜੂ ਸ਼ਸਤਰ ਕਲਾ ਹੈ ਜਿਸਦੀ ਪੁਰਾਤਨ ਸਮੇਂ ਤੋਂ ਹੀ ਮਾਨਵ ਜਾਤੀ ਵੱਲੋਂ ਸਵੈ-ਰੱਖਿਆ ਲਈ ਇਕ ਕਲਾ ਵਜੋਂ ਵਰਤੋਂ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ। ਇਹ ਰਵਾਇਤੀ ਮਾਰਸ਼ਲ ਕਲਾ ਲਗ-ਭਗ 4 ਹਜ਼ਾਰ ਸਾਲ ਪਹਿਲਾਂ ਹਿੰਦੁਸਤਾਨ ਵਿਚ ਉਪਜੀ ਅਤੇ ਸਮਾਂ ਬੀਤਣ ਨਾਲ ਹੋਰ ਵਿਕਸਿਤ ਹੁੰਦੀ ਗਈ ਜਿਸ ਕਰਕੇ ਇਹ ਸਭ ਜੰਗਜੂ ਕਲਾਵਾਂ (ਆਰਟਸ) ਦੀ ਸਿਰਜਣਹਾਰੀ ਬਣ ਗਈ।";

const OUR_ACHIEVEMENTS_ITEMS = [
  "ਪੰਜਾਬ ਉਲੰਪਿਕ ਐਸੋਸੀਏਸ਼ਨ ਰਜਿ. ਨੇ ਪੰਜਾਬ ਗਤਕਾ ਐਸੋਸੀਏਸ਼ਨ ਨੂੰ ਐਫੀਲੀਏਸ਼ਨ ਦੇ ਦਿੱਤੀ ਹੈ।",
  "ਰਵਾਇਤੀ ਮਾਰਸ਼ਲ ਆਰਟ ਦੀ ਸਦੀਵੀ ਵਿਰਾਸਤੀ ਸੰਭਾਲ ਅਤੇ ਇਸ ਨੂੰ ਵਿਧੀਵਤ ਢੰਗ ਨਾਲ ਵਿਕਸਿਤ ਕਰਨ ਲਈ ‘ਵਿਰਸਾ ਸੰਭਾਲ ਗਤਕਾ’ ਮੁਕਾਬਲਿਆਂ ਦੀ ਲੜੀ ਅਰੰਭੀ ਹੈ।",
  "ਸਿੱਖ ਮਾਰਸ਼ਲ ਆਰਟ ਗਤਕਾ ਨੂੰ ਰਾਸ਼ਟਰੀ ਅਤੇ ਅੰਤਰਰਾਸ਼ਟਰੀ ਪੱਧਰ ਤੇ ਸੰਭਾਲਣ, ਉਤਸ਼ਾਹਿਤ ਕਰਨ ਅਤੇ ਪ੍ਰਚਾਰਨ ਲਈ ਗਤਕਾ ਐਸੋਸੀਏਸ਼ਨਾਂ ਅਤੇ ਗਤਕਾ ਫੈਡਰੇਸ਼ਨਾਂ ਵੱਲੋਂ ਗਤਕੇ ਦੇ ਇਤਿਹਾਸ ਬਾਰੇ ਇਕ ਦਸਤਾਵੇਜ਼ੀ ਫ਼ਿਲਮ ਨਿਰਮਾਣ ਅਧੀਨ ਹੈ।",
  "ਗਤਕਾ ਫੈਡਰੇਸ਼ਨਾਂ ਵੱਲੋਂ ਪਹਿਲੀ ਵਾਰ ਪੰਜਾਬ ਰਾਜ ਸੀਨੀਅਰ ਮਹਿਲਾ ਗਤਕਾਓਪਨ ਚੈਂਪੀਅਨਸ਼ਿਪ-2012 ਸੈਂਟਰਲ ਯਤੀਮਖਾਨਾ ਅੰਮ੍ਰਿਤਸਰ ਵਿਖੇ 11 ਮਾਰਚ, 2012 ਨੂੰ ਕਰਵਾਈ ਗਈ।",
  "ਗਤਕਾ ਐਸੋਸੀਏਸ਼ਨ ਨੇ ਪਹਿਲੀ ਪੰਜਾਬ ਰਾਜ ਸੀਨੀਅਰ ਗਤਕਾ ਓਪਨ ਚੈਪੀਅਨਸ਼ਿਪ-2011 ਮੋਹਾਲੀ ਅਜੀਤਗੜ੍ਹ ਵਿਖੇ 4 ਮਾਰਚ ਤੋਂ 6 ਮਾਰਚ, 2011 ਸਫ਼ਲਤਾਪੂਰਵਕ ਆਯੋਜਿਤ ਕਰਵਾਈ।",
  "ਗਤਕਾ ਫੈਡਰੇਸ਼ਨ ਨੇ ਪਹਿਲੀ ਰਾਸ਼ਟਰੀ ਗਤਕਾ ਓਪਨ ਚੈਂਪੀਅਨਸ਼ਿਪ 2011 ਅਕਾਲ ਡਿਗਰੀ ਕਾਲਜ, ਮਸਤੂਆਣਾ ਸਾਹਿਬ, ਜ਼ਿਲ੍ਹਾ ਸੰਗਰੂਰ ਪੰਜਾਬ ਵਿਖੇ 11 ਤੋਂ 13 ਨਵੰਬਰ ਤੱਕ ਆਯੋਜਿਤ ਕੀਤੀ।",
  "ਗਤਕਾ ਫੈਡਰੇਸ਼ਨ ਦੇ ਯਤਨਾਂ ਸਦਕਾ ਹੀ ਦੇਸ਼ ਦੇ ਸਮੂਹ ਸਕੂਲਾਂ ਵਿੱਚ ਗਤਕੇ ਨੂੰ ਖੇਡ ਵਜੋਂ ਮਾਨਤਾ ਮਿਲ ਚੁੱਕੀ ਹੈ।",
  "ਗਤਕੇ ਐਸੋਸੀਏਸ਼ਨ ਵੱਲੋਂ ਕੀਤੇ ਯਤਨਾਂ ਸਕਦਾ ਹੀ ਪੰਜਾਬ ਸਰਕਾਰ ਦੇ ਸਿੱਖਿਆ ਵਿਭਾਗ ਨੇ ਸਾਲ 2009 ਤੋਂ ਗਤਕੇ ਨੂੰ ਪੰਜਾਬ ਦੇ ਸਮੁੱਚੇ ਸਕੂਲਾਂ, ਕਾਲਜਾਂ, ਯੂਨੀਵਰਸਿਟੀਆਂ ਦੇ ਖੇਡ ਕੈਲੰਡਰਾਂ ਵਿੱਚ ਇਕ ਖੇਡ ਵਜੋਂ ਸ਼ਾਮਲ ਕਰਨ ਨਾਲ ਇਸ ਭਾਰਤੀ ਪ੍ਰਾਚੀਨ ਮਾਰਸ਼ਲ ਆਰਟ ਨੂੰ ਹੋਰ ਹੁਲਾਰਾ ਮਿਲਿਆ ਹੈ।",
  "ਗਤਕਾ ਫੈਡਰੇਸ਼ਨ ਨੇ ਫ਼ੈਸਲਾ ਕੀਤਾ ਹੈ ਕਿ ਦੇਸ਼ ਦੇ ਵੱਖ-ਵੱਖ ਥਾਵਾਂ 'ਤੇ ਗਤਕੇ ਦੇ ਹਰ ਸਾਲ ਸਥਾਪਿਤ ਖੇਡ ਮੁਕਾਬਲੇ ਆਯੋਜਿਤ ਕਰਵਾਏ ਜਾਣ। ਸਾਲ 2018 ਤੱਕ 7 ੧ਓ ਗਤਕਾ ਕੱਪ ਸਫਲਤਾ ਪੂਰਵਕ ਕਰਵਾਏ ਜਾ ਚੁੱਕੇ ਹਨ।",
  "ਜ਼ਿਕਰਯੋਗ ਹੈ ਕਿ ਪੰਜਾਬ ਯੂਨੀਵਰਸਿਟੀਜਦੋਂ ਲਾਹੌਰ ਵਿਖੇ ਸਥਾਪਿਤ ਸੀ ਤਾਂ ਉਦੋਂ ਇਹ ਗਤਕਾ ਖੇਡ ਵਿੱਚ ਮਾਰਗ ਦਰਸ਼ਕ ਯੂਨੀਵਰਸਿਟੀ ਸੀ।",
  "ਗਤਕਾ ਫੈਡਰੇਸ਼ਨਾਂ ਦੇ ਸਹਿਯੋਗ ਨਾਲ ਗਤਕਾ ਖੇਡਣ ਲਈ ਨਿਯਮਾਂ ਸੰਬੰਧੀ ਪਹਿਲੀ ਵਾਰ ‘ਸਚਿੱਤਰ ਗਤਕਾ ਨਿਯਮਾਂਵਲੀ ਰੂਲਜ਼ ਬੁੱਕ ਤਿਆਰ ਕੀਤੀ ਹੈ।",
  "ਗਤਕਾ ਫੈਡਰੇਸ਼ਨ ਨੇ ਗਤਕਾ ਨਿਯਮਾਂਵਲੀ ਮੁਤਾਬਿਕ ਖਿਡਾਰੀਆਂ ਲਈ ਖੇਡ ਪੁਸ਼ਾਕ ਅਪਣਾਈ ਹੈ।",
  "ਵੱਖ-ਵੱਖ ਰਾਜਾਂ ਦੇ ਗਤਕਾ ਆਫ਼ਸ਼ੀਅਲ, ਰੈਫਰੀ, ਕੋਚ, ਜੱਜ-ਮੈਂਟ ਅਤੇ ਤਕਨੀਕੀ ਸਹਾਇਕਾਂ ਨੂੰ ਸਿਖਲਾਈ ਦੇਣ ਲਈ ਗਤਕਾ ਫੈਡਰੇਸ਼ਨ ਰਾਜ ਅਤੇ ਰਾਸ਼ਟਰੀ ਪੱਧਰ 'ਤੇ ਸਿਖਲਾਈ ਕੈਂਪ, ਸੈਮੀਨਾਰ ਅਤੇ ਵਰਕਸ਼ਾਪਾਂ ਵੀ ਆਯੋਜਿਤ ਕਰਵਾਉਂਦੀ ਹੈ।",
  "ਗਤਕਾ ਆਫ਼ਸ਼ੀਅਲਾਂ ਨੂੰ ਸਰਟੀਫਾਇਡ ਕਰਨ ਲਈ ਗਤਕਾ ਫੈਡਰੇਸ਼ਨ ਵੱਲੋਂ ਪਹਿਲੀ ਵਾਰ “ਆਫ਼ੀਸ਼ੀਅਲ ਸਰਟੀਫਿਕੇਸ਼ਨ ਟੈਸਟ ਸ਼ੁਰੂ ਕੀਤਾ ਗਿਆਹੈ।",
  "ਗਤਕਾ ਫੈਡਰੇਸ਼ਨ ਨੇ ਗਤਕਾ ਖੇਡ ਵਿੱਚ ਨਵੀਨਤਾ ਲਿਆਉਣ ਤੇ ਟੂਰਨਾਮੈਂਟ ਦੌਰਾਨ ਵਧੇਰੇ ਆਕਰਸ਼ਨ ਪੈਦਾ ਕਰਨ ਲਈ ਸਮਾਰਟ ਪਛਾਣ ਪੱਤਰ ਅਤੇ ਕੰਪਿਊਟਰੀਕ੍ਰਿਤ ਪ੍ਰਬੰਧ ਯੋਜਨਾ ਉਲੀਕੀ ਹੈ।",
  "ਪੰਜਾਬੀ ਯੂਨੀਵਰਸਿਟੀ ਅਤੇ ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਯੂਨੀਵਰਸਿਟੀ ਅੰਮ੍ਰਿਤਸਰ ਨਾਲ ਹੋਏ ਐਮ.ਓ ਯੂ ਤਹਿਤ ਗਤਕੇ ਦੀ ਸਿਖਲਾਈ ਲਈ ਇਕ ਸਾਲ ਦਾ ਡਿਪਲੋਮਾਕੋਰਸ ਸ਼ੁਰੂ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।",
  "ਗਤਕਾ ਫੈਡਰੇਸ਼ਨ ਨੇ ਦੇਸ਼ ਵਿੱਚ ਗਤਕਾ ਖੇਡ ਨੂੰ ਉਤਸ਼ਾਹਿਤ ਕਰਨ ਲਈ ਇਕ ਦਰਜਨ ਤੋਂ ਵੱਧ ਰਾਜਾਂ ਵਿੱਚ ਗਤਕਾ ਐਸੋਸੀਏਸ਼ਨਾਂ ਸਥਾਪਿਤ ਕੀਤੀਆਂ ਹਨ।",
  "ਪਹਿਲੀ ਆਲ ਇੰਡੀਆ ਇੰਟਰ ਯੂਨੀਵਰਸਿਟੀ ਗਤਕਾ ਚੈਂਪੀਅਨਸ਼ਿਪ ਪੰਜਾਬੀ ਯੂਨੀਵਰਸਿਟੀ ਪਟਿਆਲਾ ਵਿਖੇ 9-10 ਫਰਵਰੀ 2016 ਨੂੰ ਹੋਈ ਅਤੇ ਹਰ ਸਾਲ ਨਿਰੰਤਰ ਰੂਪ ਵਿੱਚ ਹੋ ਰਹੀ ਹੈ।",
];

const OUR_ACHIEVEMENTS_HTML = `
<p>${OUR_ACHIEVEMENTS_INTRO}</p>
<h4>ਹੁਣ ਤੱਕ ਕੀਤੀਆਂ ਪ੍ਰਾਪਤੀਆਂ ਵਿੱਚੋਂ ਕੁਝ ਕੁ ਆਪ ਨਾਲ ਸਾਂਝੀਆਂ ਕਰਦੇ ਹਾਂ:</h4>
<ol>
${OUR_ACHIEVEMENTS_ITEMS.map((item) => `  <li>${item}</li>`).join("\n")}
</ol>
`.trim();

export type SeedWeapon = { id: string; name: string; imageUrl: string; sortOrder: number };

export const SEED_WEAPONS: SeedWeapon[] = [
  { id: "seed-weapon-1", name: "ਸਫਾ ਜੰਗ", imageUrl: "https://punjabgatkaassociation.com/assets/images/data1.jpg", sortOrder: 1 },
  { id: "seed-weapon-2", name: "ਚੱਕਰ", imageUrl: "https://punjabgatkaassociation.com/assets/images/data2.jpg", sortOrder: 2 },
  { id: "seed-weapon-3", name: "ਕਮਦ ਕੋਟਲਾ", imageUrl: "https://punjabgatkaassociation.com/assets/images/data3.jpg", sortOrder: 3 },
  { id: "seed-weapon-4", name: "ਡਾਂਗ", imageUrl: "https://punjabgatkaassociation.com/assets/images/data4.jpg", sortOrder: 4 },
  { id: "seed-weapon-5", name: "ਮਰਹੱਟੀ", imageUrl: "https://punjabgatkaassociation.com/assets/images/data5.jpg", sortOrder: 5 },
  { id: "seed-weapon-6", name: "ਖੰਡਾ", imageUrl: "https://punjabgatkaassociation.com/assets/images/data6.jpg", sortOrder: 6 },
  { id: "seed-weapon-7", name: "ਢਾਲ਼", imageUrl: "https://punjabgatkaassociation.com/assets/images/data7.jpg", sortOrder: 7 },
  { id: "seed-weapon-8", name: "ਗਦਾ", imageUrl: "https://punjabgatkaassociation.com/assets/images/data8.jpg", sortOrder: 8 },
  { id: "seed-weapon-9", name: "ਕਟਾਰ", imageUrl: "https://punjabgatkaassociation.com/assets/images/data9.jpg", sortOrder: 9 },
  { id: "seed-weapon-10", name: "ਕਿਰਪਾਨ", imageUrl: "https://punjabgatkaassociation.com/assets/images/data10.jpg", sortOrder: 10 },
];

export type SeedAssociationMember = {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  sortOrder: number;
};

export const SEED_ASSOCIATION_MEMBERS: SeedAssociationMember[] = [
  { id: "seed-member-1", name: "Rajinder Singh Sohal", designation: "President", mobile: "9592913021", sortOrder: 1 },
  { id: "seed-member-2", name: "Baljinder Singh Toor", designation: "General Secretary", mobile: "9317635584", sortOrder: 2 },
  { id: "seed-member-3", name: "Jagkiran Kaur Warraich", designation: "Joint Secretary", mobile: "9988625758", sortOrder: 3 },
  { id: "seed-member-4", name: "Dr. Kuldeep Singh", designation: "Finance Secretary", mobile: "9815993708", sortOrder: 4 },
  { id: "seed-member-5", name: "Arshad", designation: "Vice President", mobile: "9914357782", sortOrder: 5 },
  { id: "seed-member-6", name: "Daljit Kaur", designation: "Legal Advisor", mobile: "9592156666", sortOrder: 6 },
  { id: "seed-member-7", name: "Inderjeet Singh Malhi", designation: "Secretary", mobile: "9814606511", sortOrder: 7 },
  { id: "seed-member-8", name: "Dr. Davinder Singh Cheena", designation: "Member", mobile: "9888006363", sortOrder: 8 },
  { id: "seed-member-9", name: "Bhola Singh Virk", designation: "Member", mobile: "9417005481", sortOrder: 9 },
  { id: "seed-member-10", name: "Palwinder Singh", designation: "Member", mobile: "9815737212", sortOrder: 10 },
  { id: "seed-member-11", name: "Kuldeep Singh Dhaliwal", designation: "Member", mobile: "9876664207", sortOrder: 11 },
];

export type CmsPageSeed = {
  page: string;
  title: string;
  html: string;
};

export const CMS_NATIONAL_PAGES: CmsPageSeed[] = [
  { page: "HISTORY_OF_GATKA", title: "History of Gatka", html: HISTORY_OF_GATKA_HTML },
  { page: "DRESS_CODE", title: "Dress Code", html: DRESS_CODE_HTML },
  { page: "TYPES_OF_TOURNAMENTS", title: "Types of Tournaments", html: TYPES_OF_TOURNAMENTS_HTML },
];

export const CMS_STATE_PAGES: CmsPageSeed[] = [
  { page: "HISTORY_OF_ASSOCIATION", title: "History of Association", html: HISTORY_OF_ASSOCIATION_HTML },
  { page: "OUR_ACHIEVEMENTS", title: "Our Achievements", html: OUR_ACHIEVEMENTS_HTML },
];

export async function saveCmsPage(
  prisma: PrismaClient,
  page: string,
  title: string,
  html: string,
  stateId: string | null
) {
  const existing = await prisma.pagesContent.findFirst({ where: { page, stateId } });
  if (existing) {
    await prisma.pagesContent.update({
      where: { id: existing.id },
      data: { title, detailedDescription: html, isEnabled: true },
    });
    return;
  }
  await prisma.pagesContent.create({
    data: { page, title, detailedDescription: html, stateId, isEnabled: true },
  });
}

export async function seedCmsContent(prisma: PrismaClient, punjabStateId: string) {
  for (const p of CMS_NATIONAL_PAGES) {
    await saveCmsPage(prisma, p.page, p.title, p.html, null);
  }
  for (const p of CMS_STATE_PAGES) {
    await saveCmsPage(prisma, p.page, p.title, p.html, punjabStateId);
  }

  for (const weapon of SEED_WEAPONS) {
    await prisma.weapon.upsert({
      where: { id: weapon.id },
      create: { ...weapon, description: null, namePa: weapon.name, isActive: true },
      // Do not overwrite imageUrl on update — migrateCmsStatic may have stored R2 URLs.
      update: { name: weapon.name, sortOrder: weapon.sortOrder, namePa: weapon.name },
    });
  }

  for (const member of SEED_ASSOCIATION_MEMBERS) {
    await prisma.associationMember.upsert({
      where: { id: member.id },
      create: { ...member, stateId: punjabStateId },
      update: {
        name: member.name,
        designation: member.designation,
        mobile: member.mobile,
        sortOrder: member.sortOrder,
        stateId: punjabStateId,
      },
    });
  }
}
