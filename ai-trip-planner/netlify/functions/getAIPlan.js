exports.handler = async function(event, context) {
    // 1. 학생이 선택한 정보 받아오기
    const { region, duration, companion } = JSON.parse(event.body);

    // 2. Google AI에게 보낼 명령문(프롬프트) 만들기
    const prompt = `
        당신은 초등학교 5학년 학생들을 위한 친절하고 창의적인 여행 가이드입니다.
        아래 조건에 맞춰 여행 계획을 구체적으로 세워주세요.

        - 여행 지역: ${region}
        - 여행 기간: ${duration}
        - 여행 동반자: ${companion}

        결과물은 다음 마크다운 형식에 맞춰 한글로 작성해주세요:
        ## 🗺️ AI가 추천하는 ${region} ${duration} 여행! (${companion})
        
        ### **1일차:** (1일차의 재미있는 소제목)
        - **오전:** [장소 이름] - (장소에 대한 1~2줄의 흥미로운 설명)
        - **오후:** [장소 이름] - (장소에 대한 1~2줄의 흥미로운 설명)

        ### **2일차:** (2일차의 재미있는 소제목)
        - **오전:** [장소 이름] - (장소에 대한 1~2줄의 흥미로운 설명)
        - **오후:** [장소 이름] - (장소에 대한 1~2줄의 흥미로운 설명)

        (기간에 맞춰 3일차, 4일차 등을 추가해주세요.)
    `;

    // 3. Google Gemini AI 호출하기
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ message: "서버 설정 오류: API 키가 없습니다." }) };
        }

        const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            const errorMessage = errorBody.error?.message || "Google AI로부터 응답을 받지 못했습니다.";
            return { statusCode: apiResponse.status, body: JSON.stringify({ message: errorMessage }) };
        }
        
        const responseData = await apiResponse.json();
        
        if (!responseData.candidates || responseData.candidates.length === 0) {
            return { statusCode: 500, body: JSON.stringify({ message: "AI가 적절한 계획을 생성하지 못했습니다. 다른 조건으로 시도해보세요." })};
        }
        
        const aiPlanText = responseData.candidates[0].content.parts[0].text;
        
        return {
            statusCode: 200,
            body: JSON.stringify({ plan: aiPlanText })
        };

    } catch (error) {
        console.error("심각한 서버 오류:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "AI 계획 생성 중 심각한 서버 오류가 발생했습니다." })
        };
    }
};