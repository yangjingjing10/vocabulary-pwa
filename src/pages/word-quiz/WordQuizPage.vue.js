import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, Loader2 } from 'lucide-vue-next';
import { getApiConfig } from '@/db/repositories/api-config.repository';
import '@/styles/pages/word-quiz-page.css';
const props = defineProps();
const emit = defineEmits();
const questions = ref([]);
const currentQuestionIndex = ref(0);
const userAnswer = ref('');
const isSubmittingAll = ref(false);
const isCompleted = ref(false);
const isLoading = ref(true);
const results = ref([]);
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value]);
const progress = computed(() => `${currentQuestionIndex.value + 1} / ${questions.value.length}`);
const correctCount = computed(() => results.value.filter(r => r.isCorrect).length);
const accuracy = computed(() => {
    if (results.value.length === 0)
        return 0;
    return Math.round((correctCount.value / results.value.length) * 100);
});
const incorrectResults = computed(() => results.value.filter(r => !r.isCorrect));
onMounted(() => {
    generateQuestions();
    isLoading.value = false;
});
function generateQuestions() {
    questions.value = props.words.map(word => ({
        word,
        userAnswer: ''
    }));
    questions.value = shuffleArray(questions.value);
}
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function nextQuestion() {
    if (!userAnswer.value.trim()) {
        return;
    }
    questions.value[currentQuestionIndex.value].userAnswer = userAnswer.value;
    userAnswer.value = '';
    if (currentQuestionIndex.value < questions.value.length - 1) {
        currentQuestionIndex.value++;
    }
    else {
        submitAllAnswers();
    }
}
async function submitAllAnswers() {
    isSubmittingAll.value = true;
    try {
        const answeredQuestions = questions.value.map(q => ({
            word: q.word,
            userAnswer: q.userAnswer
        }));
        const gradedResults = await gradeAllAnswers(answeredQuestions);
        results.value = gradedResults;
        isCompleted.value = true;
    }
    catch (error) {
        console.error('Failed to grade answers:', error);
        alert('批改失败，请重试');
    }
    finally {
        isSubmittingAll.value = false;
    }
}
async function gradeAllAnswers(answeredQuestions) {
    try {
        console.log('开始批改，题目数量:', answeredQuestions.length);
        const startTime = Date.now();
        const apiConfig = await getApiConfig();
        console.log('获取 API 配置:', apiConfig?.baseUrl);
        if (!apiConfig) {
            return answeredQuestions.map(q => ({
                word: q.word,
                userAnswer: q.userAnswer,
                correctAnswer: '无法获取API配置',
                isCorrect: false
            }));
        }
        const prompt = `You are grading an English vocabulary quiz. For each word, check if the student's answer is correct.

Words and student answers:
${answeredQuestions.map((q, i) => `${i + 1}. Word: ${q.word}, Student answer: ${q.userAnswer}`).join('\n')}

Return ONLY a JSON array with this exact format:
[{"word":"word1","correct":true,"answer":"correct meaning"},{"word":"word2","correct":false,"answer":"correct meaning"}]

Rules:
- Answer is correct if it captures the main meaning
- Be lenient with minor spelling errors
- Return valid JSON only, no explanation`;
        console.log('发送请求到:', apiConfig.baseUrl);
        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: apiConfig.textModel,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 800
            })
        });
        console.log('收到响应，状态码:', response.status);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const endTime = Date.now();
        console.log('批改完成，耗时:', (endTime - startTime) / 1000, '秒');
        console.log('AI 返回内容:', content);
        // 尝试解析 JSON
        let parsed;
        try {
            // 提取 JSON 部分（去掉可能的 markdown 代码块）
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
            else {
                throw new Error('No JSON found in response');
            }
        }
        catch (parseError) {
            console.error('JSON 解析失败:', parseError);
            console.error('原始内容:', content);
            throw new Error('Failed to parse AI response');
        }
        console.log('解析结果:', parsed);
        // 转换为 QuizResult 格式
        const gradedResults = answeredQuestions.map((q, i) => {
            const result = parsed[i];
            if (result) {
                return {
                    word: q.word,
                    userAnswer: q.userAnswer,
                    correctAnswer: result.answer || 'Unknown',
                    isCorrect: result.correct === true
                };
            }
            else {
                return {
                    word: q.word,
                    userAnswer: q.userAnswer,
                    correctAnswer: '批改失败',
                    isCorrect: false
                };
            }
        });
        console.log('最终结果:', gradedResults);
        return gradedResults;
    }
    catch (error) {
        console.error('Grading failed:', error);
        // 返回默认结果而不是抛出错误
        return answeredQuestions.map(q => ({
            word: q.word,
            userAnswer: q.userAnswer,
            correctAnswer: `批改失败: ${error}`,
            isCorrect: false
        }));
    }
}
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        nextQuestion();
    }
}
function retryQuiz() {
    currentQuestionIndex.value = 0;
    userAnswer.value = '';
    results.value = [];
    isCompleted.value = false;
    questions.value = shuffleArray(questions.value.map(q => ({ ...q, userAnswer: '' })));
}
function backToVocabulary() {
    emit('back');
}
function goToTranslation() {
    emit('startTranslation', props.words);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "word-quiz-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "quiz-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('back');
        } },
    ...{ class: "quiz-icon-button" },
    type: "button",
});
const __VLS_0 = {}.ArrowLeft;
/** @type {[typeof __VLS_components.ArrowLeft, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (18),
}));
const __VLS_2 = __VLS_1({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "quiz-content" },
});
if (__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-loading" },
    });
    const __VLS_4 = {}.Loader2;
    /** @type {[typeof __VLS_components.Loader2, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ class: "is-spinning" },
        size: (32),
    }));
    const __VLS_6 = __VLS_5({
        ...{ class: "is-spinning" },
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else if (!__VLS_ctx.isCompleted && __VLS_ctx.currentQuestion) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-progress" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quiz-progress__text" },
    });
    (__VLS_ctx.progress);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-progress__bar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-progress__fill" },
        ...{ style: ({ width: `${((__VLS_ctx.currentQuestionIndex + 1) / __VLS_ctx.questions.length) * 100}%` }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-question" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-question__type" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "quiz-question__text" },
    });
    (__VLS_ctx.currentQuestion.word);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "quiz-question__hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-input-area" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-input-wrapper" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onKeypress: (__VLS_ctx.handleKeyPress) },
        value: (__VLS_ctx.userAnswer),
        type: "text",
        ...{ class: "quiz-input" },
        placeholder: "请输入中文释义",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.nextQuestion) },
        type: "button",
        ...{ class: "quiz-submit-button" },
        disabled: (!__VLS_ctx.userAnswer.trim()),
    });
    if (__VLS_ctx.currentQuestionIndex < __VLS_ctx.questions.length - 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
else if (__VLS_ctx.isSubmittingAll) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-loading" },
    });
    const __VLS_8 = {}.Loader2;
    /** @type {[typeof __VLS_components.Loader2, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ class: "is-spinning" },
        size: (48),
    }));
    const __VLS_10 = __VLS_9({
        ...{ class: "is-spinning" },
        size: (48),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "quiz-loading__hint" },
    });
    (__VLS_ctx.questions.length);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-results" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-results__header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-results__score" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-results__score-circle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quiz-results__score-number" },
    });
    (__VLS_ctx.accuracy);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-results__stats" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-results__stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quiz-results__stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quiz-results__stat-value" },
    });
    (__VLS_ctx.results.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-results__stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quiz-results__stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quiz-results__stat-value quiz-results__stat-value--correct" },
    });
    (__VLS_ctx.correctCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-results__stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quiz-results__stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quiz-results__stat-value quiz-results__stat-value--incorrect" },
    });
    (__VLS_ctx.results.length - __VLS_ctx.correctCount);
    if (__VLS_ctx.incorrectResults.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "quiz-results__errors" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "quiz-results__error-list" },
        });
        for (const [result, idx] of __VLS_getVForSourceType((__VLS_ctx.incorrectResults))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (idx),
                ...{ class: "quiz-results__error-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "quiz-results__error-question" },
            });
            (result.word);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "quiz-results__error-answers" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "quiz-results__error-answer quiz-results__error-answer--wrong" },
            });
            (result.userAnswer);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "quiz-results__error-answer quiz-results__error-answer--correct" },
            });
            (result.correctAnswer);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "quiz-results__actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.retryQuiz) },
        type: "button",
        ...{ class: "quiz-results__button quiz-results__button--retry" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.goToTranslation) },
        type: "button",
        ...{ class: "quiz-results__button quiz-results__button--primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.backToVocabulary) },
        type: "button",
        ...{ class: "quiz-results__button quiz-results__button--back" },
    });
}
/** @type {__VLS_StyleScopedClasses['word-quiz-page']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-header']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-content']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-container']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-progress']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-progress__text']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-progress__bar']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-progress__fill']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-question']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-question__type']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-question__text']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-question__hint']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-input-area']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-input-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-input']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-submit-button']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['is-spinning']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-loading__hint']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__header']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__score']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__score-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__score-number']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat-value--correct']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__stat-value--incorrect']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__errors']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__error-list']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__error-item']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__error-question']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__error-answers']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__error-answer']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__error-answer--wrong']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__error-answer']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__error-answer--correct']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__button']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__button--retry']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__button']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__button--primary']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__button']} */ ;
/** @type {__VLS_StyleScopedClasses['quiz-results__button--back']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            Loader2: Loader2,
            emit: emit,
            questions: questions,
            currentQuestionIndex: currentQuestionIndex,
            userAnswer: userAnswer,
            isSubmittingAll: isSubmittingAll,
            isCompleted: isCompleted,
            isLoading: isLoading,
            results: results,
            currentQuestion: currentQuestion,
            progress: progress,
            correctCount: correctCount,
            accuracy: accuracy,
            incorrectResults: incorrectResults,
            nextQuestion: nextQuestion,
            handleKeyPress: handleKeyPress,
            retryQuiz: retryQuiz,
            backToVocabulary: backToVocabulary,
            goToTranslation: goToTranslation,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
