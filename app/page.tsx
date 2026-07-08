'use client';
import { useState, useEffect } from 'react';
import {
  extractAppId,
  fetchUSReviews,
  cleanReviewData,
  initDB,
  saveRawData,
  saveCleanReviews,
  saveAnalysisSnapshot,
  exportRawEvidence,
  LLM_PROMPTS,
  runLLMAnalysis,
  detectHallucination
} from '@/lib/utils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReviewAnalyzer() {
  // 输入框状态
  const [appUrl, setAppUrl] = useState('https://apps.apple.com/us/app/workout-for-women-home-gym/id839285684');
  const [apiKey, setApiKey] = useState('');
  const [isClient, setIsClient] = useState(false);

  // 初始化客户端并加载 localStorage
  useEffect(() => {
    setIsClient(true);
    const savedKey = localStorage.getItem('openai_key') || '';
    setApiKey(savedKey);
  }, []);

  // 流水线进度配置
  const stepNames = [
    '1.美区评论数据采集',
    '2.评论清洗结构化',
    '3.评论分类&痛点量化分析',
    '4.多版本迭代路线规划',
    '5.标准化PRD自动生成',
    '6.带溯源测试用例生成'
  ];
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingStep, setLoadingStep] = useState<number | null>(null);

  // 各阶段产出存储
  const [rawReviewData, setRawReviewData] = useState<any>(null);
  const [cleanReviews, setCleanReviews] = useState<any[]>([]);
  const [painPoints, setPainPoints] = useState<any>(null);
  const [versionPlan, setVersionPlan] = useState<any>(null);
  const [prdDoc, setPrdDoc] = useState<any>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [hallucinationWords, setHallucinationWords] = useState<string[]>([]);

  // 溯源弹窗控制
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReviewText, setModalReviewText] = useState('');

  // 密钥本地持久化
  const saveKey = (key: string) => {
    localStorage.setItem('openai_key', key);
    setApiKey(key);
  };

  // 打开评论溯源弹窗
  const openReviewModal = (text: string) => {
    setModalReviewText(text);
    setModalOpen(true);
  };

  // 辅助函数：从LLM返回的文本中智能提取JSON
  const extractJsonFromText = (text: string, stepName: string = 'Unknown'): any => {
    // 输出原始文本用于调试
    console.log(`[${stepName}] LLM 返回的原始文本:`, text.substring(0, 500));
    
    // Step 1: 清除代码块标记
    let cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/```\s*$/g, '')
      .trim();
    
    console.log(`[${stepName}] 清除代码块后:`, cleaned.substring(0, 500));
    
    // Step 2: 移除 HTML 标签（如果有的话）
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // Step 3: 找到第一个 { 和最后一个 }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error(`[${stepName}] 无法找到JSON对象的边界`, { firstBrace, lastBrace, cleanedLength: cleaned.length });
      throw new Error('无法在返回内容中找到JSON对象');
    }
    
    // Step 4: 提取JSON子串
    let jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
    console.log(`[${stepName}] 提取的JSON字符串:`, jsonStr.substring(0, 500));
    
    // Step 5: 尝试直接解析
    try {
      const result = JSON.parse(jsonStr);
      console.log(`[${stepName}] JSON解析成功！`);
      return result;
    } catch (e) {
      console.warn(`[${stepName}] 首次解析失败，尝试修复...`, e.message);
    }
    
    // Step 6: 常见修复尝试
    let attempts = [];
    
    // 尝试1: 修复单引号
    let fixed1 = jsonStr.replace(/'/g, '"');
    attempts.push({ name: '修复单引号', str: fixed1 });
    
    // 尝试2: 移除末尾逗号
    let fixed2 = jsonStr
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    attempts.push({ name: '移除末尾逗号', str: fixed2 });
    
    // 尝试3: 结合修复
    let fixed3 = jsonStr
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    attempts.push({ name: '结合修复', str: fixed3 });
    
    for (let attempt of attempts) {
      try {
        const result = JSON.parse(attempt.str);
        console.log(`[${stepName}] ${attempt.name}成功！`);
        return result;
      } catch (e) {
        console.warn(`[${stepName}] ${attempt.name}失败:`, e.message);
      }
    }
    
    // 所有尝试都失败
    console.error(`[${stepName}] 所有JSON解析尝试都失败，原始JSON:`, jsonStr);
    throw new Error(`无法解析JSON内容（已尝试多种修复方式）`);
  };

  // 完整6阶段串行流水线主函数
  const runAllPipeline = async () => {
    try {
      if (!appUrl.trim() || !apiKey.trim()) return alert('请填写App Store链接与OpenAI API Key');
      await initDB();
      setCurrentStep(0);

      // Step1 美区评论采集
      setLoadingStep(1);
      const appId = extractAppId(appUrl);
      if (!appId) throw new Error('无法解析App ID，请检查链接格式');
      const raw = await fetchUSReviews(appId);
      if (!raw || !raw.reviewList) throw new Error('采集评论失败，请检查App链接是否正确');
      setRawReviewData(raw);
      await saveRawData(raw);
      setCurrentStep(1);
      setLoadingStep(null);

      // Step2 评论清洗结构化
      setLoadingStep(2);
      const cleanList = cleanReviewData(raw.reviewList);
      if (cleanList.length === 0) throw new Error('清洗后无有效评论数据');
      setCleanReviews(cleanList);
      await saveCleanReviews(cleanList);
      setCurrentStep(2);
      setLoadingStep(null);

      // Step3 LLM分类 + 幻觉检测
      setLoadingStep(3);
      const classifyRes = await runLLMAnalysis(apiKey, LLM_PROMPTS.classifyReview, cleanList);
      if (!classifyRes || !classifyRes.choices || !classifyRes.choices[0]) {
        throw new Error(`LLM API 返回错误: ${classifyRes?.error?.message || '未知错误'}`);
      }
      const classifyContent = classifyRes.choices[0].message?.content;
      if (!classifyContent) throw new Error('LLM 返回空内容，请检查 API Key 是否有效');
      const painResult = extractJsonFromText(classifyContent, 'Step3 LLM分类');
      setPainPoints(painResult);
      const suspect = detectHallucination(painResult, cleanList);
      setHallucinationWords(suspect);
      setCurrentStep(3);
      setLoadingStep(null);

      // Step4 版本规划 & PRD生成
      setLoadingStep(4);
      const prdRes = await runLLMAnalysis(apiKey, LLM_PROMPTS.generatePRD, painResult);
      if (!prdRes || !prdRes.choices || !prdRes.choices[0]) {
        throw new Error(`PRD 生成失败: ${prdRes?.error?.message || '未知错误'}`);
      }
      const prdContent = prdRes.choices[0].message?.content;
      if (!prdContent) throw new Error('PRD 生成返回空内容');
      const prdResult = extractJsonFromText(prdContent, 'Step4 PRD生成');
      setVersionPlan(prdResult.versionPlan);
      setPrdDoc(prdResult.prd);
      setCurrentStep(4);
      setLoadingStep(null);

      // Step5 PRD完成过渡
      setCurrentStep(5);

      // Step6 生成带溯源测试用例
      setLoadingStep(6);
      const caseRes = await runLLMAnalysis(apiKey, LLM_PROMPTS.generateTestCase, prdResult.prd);
      if (!caseRes || !caseRes.choices || !caseRes.choices[0]) {
        throw new Error(`测试用例生成失败: ${caseRes?.error?.message || '未知错误'}`);
      }
      const caseContent = caseRes.choices[0].message?.content;
      if (!caseContent) throw new Error('测试用例生成返回空内容');
      const caseResult = extractJsonFromText(caseContent, 'Step6 测试用例生成');
      setTestCases(caseResult.testCases);
      await saveAnalysisSnapshot({
        rawReviewData: raw,
        cleanReviews: cleanList,
        painPoints: painResult,
        versionPlan: prdResult.versionPlan,
        prdDoc: prdResult.prd,
        testCases: caseResult.testCases
      });
      setCurrentStep(6);
      setLoadingStep(null);
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      alert(`流水线执行出错: ${errorMsg}`);
      console.error('流水线错误详情:', error);
      setLoadingStep(null);
      setCurrentStep(0);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* 区块1：常驻数据源合规说明面板（不可折叠，评审硬性要求） */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">数据源合规说明（评审必看）</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>1. 数据来源：Apple官方美区RSS Customer Reviews API，未使用网页爬虫</li>
          <li>2. 链接兼容逻辑：自动提取中美区App链接ID，强制调用US美区接口</li>
          <li>3. 客观局限性：API仅返回最新500条评论、每分钟10次限流、无用户设备/地域数据</li>
          <li>4. 数据存证：原始API返回JSON存入浏览器IndexedDB，支持一键导出复现核验</li>
          <li className="text-amber-600 font-medium">AI防幻觉机制：LLM仅基于本地评论输出，无匹配内容自动标记黄色可疑词汇</li>
        </ul>
      </div>

      {/* 区块2：任务启动输入区 */}
      <div className="border rounded-xl p-5">
        <h2 className="text-xl font-bold mb-4">启动App评论全链路分析</h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">App Store 链接（支持中美区）</label>
            <input
              className="w-full border rounded p-2"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="粘贴App Store链接"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">OpenAI API Key（仅本地LocalStorage存储，不上传服务器）</label>
            <input
              type="password"
              className="w-full border rounded p-2"
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
              placeholder="sk-xxx"
            />
          </div>
          <button
            onClick={runAllPipeline}
            disabled={loadingStep !== null}
            className="bg-blue-600 text-white py-3 rounded-lg font-medium disabled:bg-gray-400"
          >
            Start Full Analysis Pipeline
          </button>
        </div>
      </div>

      {/* 区块3：流水线进度可视化看板 */}
      <div className="border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">流水线执行进度</h3>
        <div className="space-y-3">
          {stepNames.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white
                ${idx < currentStep ? 'bg-green-500' : loadingStep === idx+1 ? 'bg-blue-400 animate-pulse' : 'bg-gray-300'}`}>
                {idx+1}
              </div>
              <span className="flex-1">{step}</span>
              {idx < currentStep && <span className="text-green-600">✅ 完成</span>}
              {loadingStep === idx+1 && <span className="text-blue-500">处理中...</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Step1 原始采集结果面板 */}
      {currentStep >= 1 && (
        <details open className="border rounded-xl p-5">
          <summary className="font-semibold cursor-pointer">Step1 原始美区评论采集结果</summary>
          <div className="mt-4 space-y-3">
            <p>采集请求URL：{rawReviewData?.requestUrl}</p>
            <p>本次采集评论总数：{rawReviewData?.reviewList.length} 条</p>
            <button
              onClick={() => exportRawEvidence(rawReviewData.requestUrl)}
              className="px-3 py-1 bg-gray-100 rounded border"
            >
              导出原始API凭证JSON（用于评审复现核验）
            </button>
            <pre className="bg-gray-100 p-3 text-xs overflow-auto max-h-60">
              {JSON.stringify(rawReviewData?.rawJson, null, 2).slice(0, 1200)}...
            </pre>
          </div>
        </details>
      )}

      {/* Step2 清洗后结构化评论面板 */}
      {currentStep >= 2 && (
        <details open className="border rounded-xl p-5">
          <summary className="font-semibold cursor-pointer">Step2 结构化清洗评论数据</summary>
          <div className="mt-4">
            <h4 className="font-medium mb-2">清洗规则：过滤空评论、去除乱码、拆分多诉求复合评论</h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">评论ID</th>
                  <th className="border p-2">星级</th>
                  <th className="border p-2">评论内容</th>
                  <th className="border p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {cleanReviews.slice(0,10).map(item => (
                  <tr key={item.reviewId}>
                    <td className="border p-2">{item.reviewId}</td>
                    <td className="border p-2">{item.star}星</td>
                    <td className="border p-2 max-w-xs truncate">{item.content}</td>
                    <td className="border p-2">
                      <button onClick={()=>openReviewModal(item.content)} className="text-blue-600">查看全文</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-gray-500">仅展示前10条，完整数据已存入本地IndexedDB</p>
          </div>
        </details>
      )}

      {/* Step3 痛点分类+AI幻觉标记面板 */}
      {currentStep >=3 && (
        <details open className="border rounded-xl p-5">
          <summary className="font-semibold cursor-pointer">Step3 评论分类&痛点量化分析</summary>
          <div className="mt-4 space-y-4">
            {hallucinationWords.length > 0 && (
              <div className="bg-amber-100 border border-amber-400 p-3 rounded">
                <p className="font-medium text-amber-700">⚠️ AI可疑幻觉词汇（无对应用户评论支撑）：</p>
                <span>{hallucinationWords.join('、')}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={painPoints?.sentimentChart || []} dataKey="value" nameKey="name" label />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={painPoints?.painBarChart || []}>
                  <XAxis dataKey="name"/>
                  <YAxis/>
                  <Tooltip/>
                  <Bar fill="#3b82f6"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="font-medium mt-4">Top高频痛点清单（每条附带原始评论溯源）</h4>
              {painPoints?.topPainList?.map((item:any, idx:number) => (
                <div key={idx} className="border p-3 mt-2 rounded">
                  <p className="font-medium">{item.painDesc}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {item.sourceReviews.map((txt:string, i:number) => (
                      <button key={i} onClick={()=>openReviewModal(txt)} className="text-sm text-blue-600 bg-gray-50 px-2 py-1 rounded">
                        查看来源评论{i+1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Step4 多版本迭代规划面板 */}
      {currentStep >=4 && (
        <details open className="border rounded-xl p-5">
          <summary className="font-semibold cursor-pointer">Step4 多版本迭代规划</summary>
          <div className="mt-4">
            {versionPlan?.map((v:any, idx:number) => (
              <div key={idx} className="border p-4 mb-3 rounded">
                <h4 className="font-bold text-lg">{v.versionName}（优先级{v.priority}）</h4>
                <p className="text-sm text-gray-600">解决痛点总数：{v.relatedReviewCount}条用户反馈</p>
                <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                  <div className="bg-green-50 p-2 border rounded">
                    <p className="font-medium">本次纳入需求</p>
                    <ul className="list-disc pl-4">{v.includeReqs?.map((r:string,i:number)=><li key={i}>{r}</li>)}</ul>
                  </div>
                  <div className="bg-yellow-50 p-2 border rounded">
                    <p className="font-medium">暂不落地需求</p>
                    <ul className="list-disc pl-4">{v.excludeReqs?.map((r:string,i:number)=><li key={i}>{r}</li>)}</ul>
                  </div>
                  <div className="bg-blue-50 p-2 border rounded">
                    <p className="font-medium">长期规划需求</p>
                    <ul className="list-disc pl-4">{v.futureReqs?.map((r:string,i:number)=><li key={i}>{r}</li>)}</ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Step5 带溯源PRD文档面板 */}
      {currentStep >=5 && (
        <details open className="border rounded-xl p-5">
          <summary className="font-semibold cursor-pointer">Step5 标准化溯源PRD</summary>
          <div className="mt-4 space-y-3">
            <h4 className="text-lg font-bold">{prdDoc?.versionTarget}</h4>
            <p className="text-gray-600">需求全部绑定原始用户评论证据，无溯源需求禁止生成</p>
            {prdDoc?.requirementList?.map((req:any, idx:number) => (
              <div key={idx} className="border p-3 rounded">
                <p className="font-medium">需求{idx+1}：{req.desc}</p>
                <p className="text-sm text-gray-500 mt-1">需求边界：{req.scopeLimit}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-sm">支撑评论：</span>
                  {req.sourceReviewTexts?.map((txt:string,i:number)=>(
                    <button key={i} onClick={()=>openReviewModal(txt)} className="text-sm text-blue-600 bg-gray-50 px-2 py-1 rounded">
                      溯源原文{i+1}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Step6 绑定溯源测试用例面板 */}
      {currentStep >=6 && (
        <details open className="border rounded-xl p-5">
          <summary className="font-semibold cursor-pointer">Step6 绑定溯源测试用例集</summary>
          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">模块</th>
                  <th className="border p-2">场景</th>
                  <th className="border p-2">预期结果（对齐用户吐槽）</th>
                  <th className="border p-2">原始用户痛点复述</th>
                  <th className="border p-2">溯源评论</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map((tc, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">{tc.module}</td>
                    <td className="border p-2">{tc.scene}</td>
                    <td className="border p-2">{tc.expectResult}</td>
                    <td className="border p-2">{tc.userPain}</td>
                    <td className="border p-2">
                      <button onClick={()=>openReviewModal(tc.sourceReviewText)} className="text-blue-600">查看原文</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* 导出功能区 */}
      <div className="flex gap-4">
        <button className="px-4 py-2 bg-gray-100 border rounded">导出全链路关联对照表CSV</button>
        <button className="px-4 py-2 bg-gray-100 border rounded">导出PRD+测试用例Markdown</button>
      </div>

      {/* 全局溯源弹窗 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white w-[650px] p-6 rounded-xl">
            <h3 className="font-bold text-lg mb-3">溯源原始用户评论原文</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{modalReviewText}</p>
            <button onClick={()=>setModalOpen(false)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">关闭弹窗</button>
          </div>
        </div>
      )}
    </div>
  );
}