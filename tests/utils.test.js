const { extractValidUrl } = require('../src/utils');

describe('URL 추출 및 검증 유틸리티 테스트', () => {
    test('정상적인 HTTPS 링크를 올바르게 추출해야 한다.', () => {
        const message = "여기에 좋은 사이트가 있어요: https://google.com";
        expect(extractValidUrl(message)).toBe('https://google.com/');
    });

    test('정상적인 HTTP 링크를 올바르게 추출해야 한다.', () => {
        const message = "http://example.com/path?query=1 접속해봐";
        expect(extractValidUrl(message)).toBe('http://example.com/path?query=1');
    });

    test('메시지에 여러 링크가 포함된 경우 첫 번째 링크만 추출해야 한다.', () => {
        const message = "첫번째 https://first.com 두번째 https://second.com";
        expect(extractValidUrl(message)).toBe('https://first.com/');
    });

    test('링크가 없는 메시지인 경우 null을 반환해야 한다.', () => {
        const message = "안녕 링크 없는 텍스트야";
        expect(extractValidUrl(message)).toBeNull();
    });

    test('http/https가 아닌 악의적인 스킴(javascript:)은 무시해야 한다.', () => {
        const message = "javascript:alert(1);";
        expect(extractValidUrl(message)).toBeNull();
    });

    test('http/https가 아닌 로컬 파일 스킴(file://)은 무시해야 한다.', () => {
        const message = "file:///C:/Windows/System32/cmd.exe";
        expect(extractValidUrl(message)).toBeNull();
    });

    test('입력값이 비어있거나 문자열이 아닌 경우 null을 반환해야 한다.', () => {
        expect(extractValidUrl(null)).toBeNull();
        expect(extractValidUrl(undefined)).toBeNull();
        expect(extractValidUrl(123)).toBeNull();
    });

    // --- 추가된 엣지 케이스 및 보안 관련 테스트 ---

    test('쿼리스트링과 해시가 포함된 URL을 올바르게 추출해야 한다.', () => {
        const message = "자세한 정보는 https://example.com/search?q=test&page=1#result 에서 확인하세요.";
        expect(extractValidUrl(message)).toBe('https://example.com/search?q=test&page=1#result');
    });

    test('한글 도메인이나 경로가 포함된 URL을 처리해야 한다. (Punycode 변환 또는 인코딩)', () => {
        const message = "한글 도메인: https://한글.com/경로";
        // URL 객체는 호스트명을 punycode로, 경로를 URI 인코딩하여 반환합니다.
        expect(extractValidUrl(message)).toBe('https://xn--bj0bj06e.com/%EA%B2%BD%EB%A1%9C');
    });

    test('디스코드의 임베드 방지 태그(< >)로 감싸진 URL을 올바르게 추출해야 한다.', () => {
        const message = "이 링크 <https://discord.com> 확인해주세요.";
        expect(extractValidUrl(message)).toBe('https://discord.com/');
    });

    test('마크다운 형식 문법으로 작성된 텍스트에서 URL을 올바르게 추출해야 한다.', () => {
        const message = "여기 [구글](https://google.com) 링크입니다.";
        expect(extractValidUrl(message)).toBe('https://google.com/');
    });

    test('문장 끝에 온점, 쉼표 등 구두점이 있는 경우 이를 제외하고 URL을 추출해야 한다.', () => {
        expect(extractValidUrl("링크는 https://example.com/path, 이고요")).toBe('https://example.com/path');
        expect(extractValidUrl("여기로 오세요. https://example.com/path.")).toBe('https://example.com/path');
    });

    test('XSS 시도가 포함된 기형적인 URL은 URL 객체에 의해 안전하게 인코딩되어야 한다.', () => {
        const message1 = "해킹시도: https://example.com/\"onmouseover=\"alert(1)";
        // 마지막 )는 문장 부호 제어로 인해 잘려나가며, URL 객체는 따옴표를 인코딩합니다.
        expect(extractValidUrl(message1)).toBe('https://example.com/%22onmouseover=%22alert(1');
        
        const message2 = "해킹시도2: https://example.com/?q=\"onmouseover=\"alert(1)x";
        expect(extractValidUrl(message2)).toBe('https://example.com/?q=%22onmouseover=%22alert(1)x');
    });
});