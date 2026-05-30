/**
 * 메시지 문자열에서 유효한 HTTP/HTTPS URL을 추출합니다.
 * @param {string} content - 디스코드 메시지 내용
 * @returns {string|null} - 추출된 첫 번째 유효한 URL, 없으면 null
 */
function extractValidUrl(content) {
    if (!content || typeof content !== 'string') return null;

    // HTTP/HTTPS URL 추출 정규식
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);

    if (urls && urls.length > 0) {
        // 첫 번째 URL 가져오기 및 디스코드 마크다운/문장 구두점 등 후행 특수문자 제거
        let targetUrl = urls[0];
        targetUrl = targetUrl.replace(/[>)\].;,"']+$/, '');
        
        // 추가적인 보안 검증: javascript: 등 방지 (정규식으로 1차 필터링 되지만, URL 객체로 2차 검증)
        try {
            const parsedUrl = new URL(targetUrl);
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                return parsedUrl.href;
            }
        } catch (e) {
            // URL 파싱 실패 시 유효하지 않은 URL로 간주
            return null;
        }
    }

    return null;
}

module.exports = {
    extractValidUrl
};