// ローカル開発用サンプルデータ（12週・12ヶ月・5年分）
// テーマタグ8種: 本業 転職 副業 AI 心理 家族 剣道 信仰

// tagSummaries ヘルパー: [tag, posCount, negCount, positive, negative, shortLabel]
function ts(items: Array<[string, number, number, string, string, string]>) {
  return JSON.stringify(items.map(([tag, posCount, negCount, positive, negative, shortLabel]) => ({
    tag, posCount, negCount, positive, negative, shortLabel,
  })))
}

// ================================================================
// CONVERSATIONS & MESSAGES
// ================================================================

export const seedConversations = [
  { id: 'conv-001', title: 'AI副業について相談', createdAt: '2026-05-10 09:00:00', updatedAt: '2026-05-10 09:30:00' },
  { id: 'conv-002', title: 'キャリアの方向性', createdAt: '2026-06-01 20:00:00', updatedAt: '2026-06-01 20:45:00' },
  { id: 'conv-003', title: '地方移住のリアルな話', createdAt: '2025-09-20 21:00:00', updatedAt: '2025-09-20 21:40:00' },
  { id: 'conv-004', title: '子育てと副業の両立', createdAt: '2026-02-05 22:00:00', updatedAt: '2026-02-05 22:30:00' },
]

export const seedMessages = [
  { id: 'msg-001', conversationId: 'conv-001', role: 'user' as const, content: 'AIを使った副業で月10万円を目指したいんだけど、どんなことができそう？', createdAt: '2026-05-10 09:00:00' },
  { id: 'msg-002', conversationId: 'conv-001', role: 'assistant' as const, content: 'AIを活用した副業はいくつか現実的な選択肢があります。特にマーケティングとAIの知識を組み合わせると、コンテンツ制作支援、プロンプトエンジニアリングのコンサルティング、AI活用研修の講師などが考えられます。', createdAt: '2026-05-10 09:05:00' },
  { id: 'msg-003', conversationId: 'conv-001', role: 'user' as const, content: 'プロンプトエンジニアリングのコンサルは面白そう。でも実績がないとクライアント獲得が難しそう…', createdAt: '2026-05-10 09:10:00' },
  { id: 'msg-004', conversationId: 'conv-001', role: 'assistant' as const, content: 'まず社内で実績を作るのが近道です。今の会社でAI活用の提案を1件やってみて、それをポートフォリオにする。「業務を〇〇%効率化」という具体的な数字があればクライアントに見せられます。', createdAt: '2026-05-10 09:15:00' },
  { id: 'msg-005', conversationId: 'conv-002', role: 'user' as const, content: '最近、転職するか今の会社で頑張るか迷ってる。副業も軌道に乗ってきたし。', createdAt: '2026-06-01 20:00:00' },
  { id: 'msg-006', conversationId: 'conv-002', role: 'assistant' as const, content: '転職か現職継続かは、副業の状況と合わせて考えると整理しやすいです。副業月収が現職の25〜30%に達したら「選択肢が増えた」状態です。今はどれくらいですか？', createdAt: '2026-06-01 20:05:00' },
  { id: 'msg-007', conversationId: 'conv-003', role: 'user' as const, content: '長野や山梨への移住を考えてるんだけど、現実的に何から始めればいい？', createdAt: '2025-09-20 21:00:00' },
  { id: 'msg-008', conversationId: 'conv-003', role: 'assistant' as const, content: 'まずは「お試し移住」から始めるのがリスクが少ないです。3〜5日間、実際に生活するように過ごしてみる。スーパー、病院、保育園の場所を確認して。副業があれば収入の心配は薄いですが、パートナーの仕事環境も合わせて確認が必要です。', createdAt: '2025-09-20 21:08:00' },
  { id: 'msg-009', conversationId: 'conv-004', role: 'user' as const, content: '子どもが夜泣きで睡眠不足だし、副業も進めたいし、身体が持たない気がしてきた', createdAt: '2026-02-05 22:00:00' },
  { id: 'msg-010', conversationId: 'conv-004', role: 'assistant' as const, content: '睡眠不足の中での副業は品質も落ちるし長続きしません。今の段階では「副業ゼロにはしないが週1時間だけ」という最低限ラインを決めて、育児最優先にシフトするのが長期的に得策です。子どもの夜泣きは必ず終わりがある一方、副業は再開できます。', createdAt: '2026-02-05 22:08:00' },
]

// ================================================================
// IMPORTED FILES
// ================================================================

export const seedImportedFiles = [
  { id: 'file-001', fileName: 'chatgpt_2026_04.json', content: '{"conversations": [...] }', status: 'done' as const, createdAt: '2026-05-01 10:00:00', updatedAt: '2026-05-01 10:05:00' },
  { id: 'file-002', fileName: '日記_2026年5月.txt', content: '5/3 GW中もAIツール開発を続けた。\n5/10 副業の相談をした。\n5/20 剣道との両立が課題。', status: 'done' as const, createdAt: '2026-05-25 18:00:00', updatedAt: '2026-05-25 18:10:00' },
  { id: 'file-003', fileName: 'chatgpt_2025_上半期.json', content: '{"conversations": [...] }', status: 'done' as const, createdAt: '2025-07-01 09:00:00', updatedAt: '2025-07-01 09:30:00' },
  { id: 'file-004', fileName: '日記_2025年下半期.txt', content: '7/5 副業初の売上5万円超え。\n9/28 転職活動を始めた。\n12/10 MY AGENTの構想を書いた。', status: 'done' as const, createdAt: '2026-01-05 10:00:00', updatedAt: '2026-01-05 10:20:00' },
]

// ================================================================
// INTERMEDIATE RECORDS
// ================================================================

export const seedIntermediateRecords = [
  // ---- 2025 上半期 ----
  {
    id: 'ir-p01', sourceId: 'file-003', sourceType: 'imported_file' as const,
    date: '2025-01-10', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '転職']),
    what: '新年に「今年こそ副業を始める」と決意した。ChatGPTをフル活用して仕事を効率化し、浮いた時間で副業スキルを磨く計画を立てた',
    why: '昨年の年末評価が低く、会社に依存したくないという気持ちが高まったから',
    intensity: 4, createdAt: '2025-07-01 09:30:00',
  },
  {
    id: 'ir-p02', sourceId: 'file-003', sourceType: 'imported_file' as const,
    date: '2025-02-20', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: 'Claude 3を試してみて、その能力の高さに衝撃を受けた。マーケティング資料の作成速度が3倍になった',
    why: 'AIの進化の速さを肌で感じ、乗り遅れてはいけないという焦りと興奮が同時にあった',
    intensity: 5, createdAt: '2025-07-01 09:30:00',
  },
  {
    id: 'ir-p03', sourceId: 'file-003', sourceType: 'imported_file' as const,
    date: '2025-03-15', polarity: 'positive' as const,
    themeTags: JSON.stringify(['転職', '心理']),
    what: 'Claude APIを使った簡単なツールを初めて作った。動いた瞬間の達成感は格別だった',
    why: '「作れる」という自信が持てると、転職や独立の選択肢が現実味を帯びてくる',
    intensity: 5, createdAt: '2025-07-01 09:30:00',
  },
  {
    id: 'ir-p04', sourceId: 'file-003', sourceType: 'imported_file' as const,
    date: '2025-04-05', polarity: 'positive' as const,
    themeTags: JSON.stringify(['副業', 'AI']),
    what: '副業の初クライアントをSNSで獲得した。AI活用のマーケティング支援で月3万円のプロジェクト',
    why: '発信を続けていたら声がかかった。小さくても「お金をもらえた」は大きな自信になった',
    intensity: 5, createdAt: '2025-07-01 09:30:00',
  },
  {
    id: 'ir-p05', sourceId: 'file-003', sourceType: 'imported_file' as const,
    date: '2025-05-10', polarity: 'positive' as const,
    themeTags: JSON.stringify(['剣道', '心理']),
    what: '剣道の昇段審査に合格（四段）。3年越しの目標だった',
    why: '仕事・副業が忙しい中でも稽古を継続してきた成果が出た',
    intensity: 5, createdAt: '2025-07-01 09:30:00',
  },
  {
    id: 'ir-p06', sourceId: 'file-003', sourceType: 'imported_file' as const,
    date: '2025-06-15', polarity: 'positive' as const,
    themeTags: JSON.stringify(['副業', '家族']),
    what: '独立に向けて家計の棚卸しをパートナーと行い、生活費の固定費を月2万円削減できた',
    why: '副業収入が増えてきたことで、将来設計を二人で真剣に話せるようになった',
    intensity: 3, createdAt: '2025-07-01 09:30:00',
  },

  // ---- 2025 下半期 ----
  {
    id: 'ir-p07', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-07-05', polarity: 'positive' as const,
    themeTags: JSON.stringify(['副業', 'AI']),
    what: '副業の月収が初めて5万円を超えた。2社の継続契約が決まった',
    why: 'クライアントへの成果を数字で示せるようになり、継続・紹介につながった',
    intensity: 5, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p08', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-07-18', polarity: 'negative' as const,
    themeTags: JSON.stringify(['本業', '心理']),
    what: '夏の暑さと長時間労働が重なり、体力的にかなり消耗した週があった',
    why: '副業と本業の両立で睡眠時間を削っており、限界に近い状態だった',
    intensity: 4, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p09', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-08-10', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: 'Nuxt + Cloudflareで小さなWebアプリを作り、友人に使ってもらった',
    why: '技術スタックを自分で選んで作ることで、プロダクト開発の楽しさを再発見した',
    intensity: 4, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p10', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-08-25', polarity: 'positive' as const,
    themeTags: JSON.stringify(['家族']),
    what: '夏休みに長野に旅行し、地方移住への具体的なイメージが湧いた。パートナーも乗り気になった',
    why: '副業でリモート収入があれば、東京に縛られる必要はないと二人で確認できた',
    intensity: 4, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p11', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-09-12', polarity: 'positive' as const,
    themeTags: JSON.stringify(['剣道', '心理']),
    what: '半年ぶりに道場に復帰した。久しぶりの稽古で身体が鈍っていたが、仲間との再会で気持ちが上向いた',
    why: '副業が忙しく剣道を休んでいたが、心の余裕をつくるためにも再開すると決めた',
    intensity: 3, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p12', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-09-28', polarity: 'negative' as const,
    themeTags: JSON.stringify(['転職', '心理']),
    what: '転職エージェントに登録し、活動を開始した。しかし求人票を見るたびに「今より悪くなるリスク」を感じた',
    why: '転職より独立の方が自分の性質に合っている気がしてきたが、まだ決断できずにいた',
    intensity: 3, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p13', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-10-08', polarity: 'negative' as const,
    themeTags: JSON.stringify(['家族', '心理']),
    what: '親が体調を崩したと連絡があり、急遽帰省した。介護が将来的な課題になりそうだと感じた',
    why: '地方移住の検討が「親の近くに住む」という選択肢とも重なり始めた',
    intensity: 4, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p14', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-10-20', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: 'AIマーケティング活用のオンラインセミナーに登壇した。初登壇で緊張したが、アンケート評価が高かった',
    why: '発信→登壇という流れが副業収入と信頼構築につながることを実感した',
    intensity: 4, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p15', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-11-05', polarity: 'negative' as const,
    themeTags: JSON.stringify(['転職', '心理']),
    what: '転職面接を2社受けたが両方不合格。スキルより「安定志向でなさそう」と見られた可能性',
    why: '本当に転職したいのか、それとも独立したいのか、自分でも揺れている状態が面接に出た',
    intensity: 3, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p16', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-11-20', polarity: 'negative' as const,
    themeTags: JSON.stringify(['本業', '転職']),
    what: '年末評価で期待していた昇格が見送られた。上司からは「もう少し組織貢献を」と言われた',
    why: '副業や個人開発に力を入れているせいか、会社での立ち位置が変わってきている',
    intensity: 4, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p17', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-12-10', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: '「過去の自分のチャット履歴をAIに読ませて、自分の変化を可視化するツール」という構想をノートに書いた。これがMY AGENTの原型',
    why: 'ChatGPTとの会話が増えるにつれ、「自分の変化を振り返れるツールが欲しい」という欲求が生まれた',
    intensity: 5, createdAt: '2026-01-05 10:20:00',
  },
  {
    id: 'ir-p18', sourceId: 'file-004', sourceType: 'imported_file' as const,
    date: '2025-12-28', polarity: 'positive' as const,
    themeTags: JSON.stringify(['転職', '心理', 'AI']),
    what: '年末の振り返りで「転職活動をいったん止め、独立に向けた準備を加速する」と決断した',
    why: '副業収入が月8万を超え、本業への依存度が心理的に下がってきた。転職より独立の方が自分らしいと確信した',
    intensity: 5, createdAt: '2026-01-05 10:20:00',
  },

  // ---- 2026 Q1 (Jan-Mar) ----
  {
    id: 'ir-q01', sourceId: 'conv-004', sourceType: 'chat_message' as const,
    date: '2026-01-08', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: 'MY AGENTの開発をスタート。Nuxt 4 + Cloudflare D1でのアーキテクチャを決めた',
    why: '年末の決断を受けて、すぐに行動に移した。技術選定に迷いがなかった',
    intensity: 5, createdAt: '2026-01-08 22:00:00',
  },
  {
    id: 'ir-q02', sourceId: 'conv-004', sourceType: 'chat_message' as const,
    date: '2026-01-15', polarity: 'negative' as const,
    themeTags: JSON.stringify(['家族', '心理']),
    what: '子どもが熱を出して3日間自宅待機。開発が全く進まずフラストレーションが溜まった',
    why: '親としての責任と開発者としての焦りの間で揺れた。子どもには申し訳ない気持ちもあった',
    intensity: 3, createdAt: '2026-01-15 22:00:00',
  },
  {
    id: 'ir-q03', sourceId: 'conv-004', sourceType: 'chat_message' as const,
    date: '2026-01-22', polarity: 'positive' as const,
    themeTags: JSON.stringify(['副業']),
    what: '副業の2件目の継続クライアントとの契約更新。月5万→月7万に単価アップ',
    why: '半年間の成果を数字で提示したら交渉がスムーズだった',
    intensity: 4, createdAt: '2026-01-22 20:00:00',
  },
  {
    id: 'ir-q04', sourceId: 'conv-004', sourceType: 'chat_message' as const,
    date: '2026-02-05', polarity: 'negative' as const,
    themeTags: JSON.stringify(['家族']),
    what: '育児疲れがピークに。夜泣きが続き、パートナーとの関係もピリピリしていた',
    why: '互いに睡眠不足で余裕がなく、些細なことで喧嘩になった',
    intensity: 4, createdAt: '2026-02-05 23:00:00',
  },
  {
    id: 'ir-q05', sourceId: 'conv-004', sourceType: 'chat_message' as const,
    date: '2026-02-14', polarity: 'positive' as const,
    themeTags: JSON.stringify(['家族']),
    what: 'バレンタインに二人で話し合い、家事・育児の分担を見直した。パートナーがとても協力的だった',
    why: '関係がうまくいかないと何も前に進まないと気づいた。話し合いが関係修復になった',
    intensity: 4, createdAt: '2026-02-14 21:00:00',
  },
  {
    id: 'ir-q06', sourceId: 'conv-004', sourceType: 'chat_message' as const,
    date: '2026-02-22', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: 'MY AGENTの初期プロトタイプが動いた。インポートしたCSVを読ませて記憶を生成できた',
    why: '技術的な壁を一つ越えた確かな感触。「これは使えるかもしれない」という確信が生まれた',
    intensity: 5, createdAt: '2026-02-22 23:00:00',
  },
  {
    id: 'ir-q07', sourceId: 'conv-003', sourceType: 'chat_message' as const,
    date: '2026-03-03', polarity: 'positive' as const,
    themeTags: JSON.stringify(['転職', '心理']),
    what: '転職エージェントから連絡が来たが、丁寧にお断りした。独立への覚悟が固まった瞬間だった',
    why: '転職という選択肢を「消した」ことで、かえって前が見えた感覚があった',
    intensity: 4, createdAt: '2026-03-03 21:00:00',
  },
  {
    id: 'ir-q08', sourceId: 'conv-003', sourceType: 'chat_message' as const,
    date: '2026-03-15', polarity: 'positive' as const,
    themeTags: JSON.stringify(['副業', 'AI']),
    what: '副業収入が過去最高の月10万円に到達。独立に向けた貯蓄目標の達成が見えてきた',
    why: '副業が「夢」から「計画」に変わった月',
    intensity: 5, createdAt: '2026-03-15 22:00:00',
  },
  {
    id: 'ir-q09', sourceId: 'conv-003', sourceType: 'chat_message' as const,
    date: '2026-03-20', polarity: 'positive' as const,
    themeTags: JSON.stringify(['家族']),
    what: '長野の移住先を下見。地元の剣道道場も見学し、子育て環境も良さそうだと感じた',
    why: 'パートナーと二人で「ここに住めるかも」と初めて具体的に話せた',
    intensity: 4, createdAt: '2026-03-20 20:00:00',
  },
  {
    id: 'ir-q10', sourceId: 'conv-003', sourceType: 'chat_message' as const,
    date: '2026-03-25', polarity: 'positive' as const,
    themeTags: JSON.stringify(['転職', '副業']),
    what: '独立に向けた具体的な貯蓄目標（生活費1年分）を設定し、毎月の積み立て計画を立てた',
    why: '「いつ独立するか」より「どんな条件で独立できるか」を先に決めることで不安が減った',
    intensity: 4, createdAt: '2026-03-25 21:00:00',
  },

  // ---- 2026 Apr-Jun ----
  {
    id: 'ir-001', sourceId: 'file-001', sourceType: 'imported_file' as const,
    date: '2026-04-05', polarity: 'negative' as const,
    themeTags: JSON.stringify(['本業', '心理']),
    what: '新しいプロジェクトのアサインで上司と意見が合わず、モヤモヤした気持ちが続いた',
    why: '自分のキャリア方向と会社の期待がずれていると感じたため',
    intensity: 4, createdAt: '2026-05-01 10:05:00',
  },
  {
    id: 'ir-002', sourceId: 'file-001', sourceType: 'imported_file' as const,
    date: '2026-04-12', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: 'Claude APIを使ったプロトタイプが思った以上にうまく動いて達成感を感じた',
    why: '自分でゼロから作ったものが機能することへの喜び',
    intensity: 5, createdAt: '2026-05-01 10:05:00',
  },
  {
    id: 'ir-003', sourceId: 'file-001', sourceType: 'imported_file' as const,
    date: '2026-04-18', polarity: 'positive' as const,
    themeTags: JSON.stringify(['副業', 'AI']),
    what: 'AIを使ったコンテンツ戦略の提案が社内で好評だった',
    why: 'AI×マーケティングの強みが社内でも認められた',
    intensity: 4, createdAt: '2026-05-01 10:05:00',
  },
  {
    id: 'ir-004', sourceId: 'file-001', sourceType: 'imported_file' as const,
    date: '2026-04-25', polarity: 'negative' as const,
    themeTags: JSON.stringify(['転職', '心理']),
    what: '副業クライアントから来月以降の契約継続を確認し、一方で会社での閉塞感も高まった',
    why: '「外でやっていける」自信と「今の会社は違う」という確信が同時に強まった',
    intensity: 3, createdAt: '2026-05-01 10:05:00',
  },
  {
    id: 'ir-005', sourceId: 'file-002', sourceType: 'imported_file' as const,
    date: '2026-05-03', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: 'GW中にAIツールのプロトタイプ開発が進み、形になってきた',
    why: '集中して開発できる時間が取れ、長期的なビジョンが見えてきた',
    intensity: 5, createdAt: '2026-05-25 18:10:00',
  },
  {
    id: 'ir-006', sourceId: 'file-002', sourceType: 'imported_file' as const,
    date: '2026-05-10', polarity: 'positive' as const,
    themeTags: JSON.stringify(['転職', 'AI']),
    what: '副業の方向性についてAIに相談し、プロンプトエンジニアリング系の可能性が見えてきた',
    why: '自分のスキルを活かせる具体的な副業像が描けるようになったから',
    intensity: 4, createdAt: '2026-05-25 18:10:00',
  },
  {
    id: 'ir-007', sourceId: 'file-002', sourceType: 'imported_file' as const,
    date: '2026-05-20', polarity: 'negative' as const,
    themeTags: JSON.stringify(['剣道', '本業']),
    what: '剣道の稽古と仕事の両立が難しく、昇段審査の準備が思うように進んでいない',
    why: '仕事が忙しく体力的・時間的な余裕がない',
    intensity: 3, createdAt: '2026-05-25 18:10:00',
  },
  {
    id: 'ir-008', sourceId: 'msg-001', sourceType: 'chat_message' as const,
    date: '2026-05-10', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: 'AI副業で月10万を目指すという具体的な目標を立てた',
    why: '副業への本気度が増し、具体的なステップを考え始めた',
    intensity: 4, createdAt: '2026-05-10 09:30:00',
  },
  {
    id: 'ir-009', sourceId: 'msg-005', sourceType: 'chat_message' as const,
    date: '2026-06-01', polarity: 'positive' as const,
    themeTags: JSON.stringify(['転職', '心理']),
    what: '転職か現職継続かを整理するきっかけになった。副業が軌道に乗ってきて選択肢が増えた',
    why: '副業の成長が自信につながり、主体的にキャリアを考えられるようになった',
    intensity: 4, createdAt: '2026-06-01 20:45:00',
  },
  {
    id: 'ir-010', sourceId: 'msg-006', sourceType: 'chat_message' as const,
    date: '2026-06-05', polarity: 'positive' as const,
    themeTags: JSON.stringify(['副業', '家族']),
    what: '家計の見直しをパートナーと話し合い、副業収入の使い道を具体的に決めた',
    why: '副業が現実的になってきたので二人でライフプランを考えたくなった',
    intensity: 3, createdAt: '2026-06-05 21:00:00',
  },
  {
    id: 'ir-011', sourceId: 'msg-006', sourceType: 'chat_message' as const,
    date: '2026-06-10', polarity: 'negative' as const,
    themeTags: JSON.stringify(['本業', '転職']),
    what: '職場の人間関係でモヤモヤが続いた。評価基準が不透明でやる気が下がった',
    why: '努力が正当に評価されないと感じる状況が続いているから',
    intensity: 4, createdAt: '2026-06-10 22:00:00',
  },
  {
    id: 'ir-012', sourceId: 'msg-006', sourceType: 'chat_message' as const,
    date: '2026-06-15', polarity: 'positive' as const,
    themeTags: JSON.stringify(['AI', '副業']),
    what: 'このアプリ（MY AGENT）の記憶可視化機能が形になってきて、自分の変化が見えるようになった',
    why: 'ツール自体が価値を生み出していると実感できた',
    intensity: 5, createdAt: '2026-06-15 20:00:00',
  },
]

// ================================================================
// MEMORY SNAPSHOTS
// ================================================================

export const seedMemorySnapshots = [

  // ────────────────────────────────────
  // 週次 (W12〜W01: 2026-03-24 〜 2026-06-15)
  // ────────────────────────────────────
  {
    id: 'snap-w12',
    periodType: 'weekly' as const,
    periodStart: '2026-03-24', periodEnd: '2026-03-30',
    tagSummaries: ts([
      ['転職',  1, 0, '転職を「やめる」と決断したことで、逆に気持ちがすっきりした。独立への道が明確になった', '', '独立決断'],
      ['心理',  1, 0, '迷いが消えた週。覚悟が決まると不思議と前向きになれた', '', '迷い解消'],
      ['AI',    1, 0, 'MY AGENTの設計を再考し、より使いやすい構造にリファクタリングできた', '', '設計改善'],
    ]),
    createdAt: '2026-03-31 07:00:00',
  },
  {
    id: 'snap-w11',
    periodType: 'weekly' as const,
    periodStart: '2026-03-31', periodEnd: '2026-04-06',
    tagSummaries: ts([
      ['本業',  1, 0, '新年度のスタートで気持ちを切り替え、残りの在職期間を前向きに過ごす決意をした', '', '新年度切替'],
      ['AI',    1, 0, 'Cloudflare D1への移行作業が完了し、本番環境に近い構成で開発できるようになった', '', 'D1移行完了'],
      ['副業',  1, 0, '独立への貯蓄目標に向けて、サブスク整理で月3,000円の固定費削減', '', '固定費削減'],
    ]),
    createdAt: '2026-04-07 07:00:00',
  },
  {
    id: 'snap-w10',
    periodType: 'weekly' as const,
    periodStart: '2026-04-07', periodEnd: '2026-04-13',
    tagSummaries: ts([
      ['AI',    0, 1, '', 'Claude APIのレート制限にハマり、実装が止まった。デバッグに丸2日かかった', 'RL制限で停滞'],
      ['副業',  0, 1, '', '技術的な壁にぶつかるたびに「自分には無理かも」という不安が一瞬よぎる', '限界感あり'],
      ['心理',  0, 1, '', '開発の停滞でやや落ち込んだ週。気分転換に剣道の素振りをした', '落ち込み'],
    ]),
    createdAt: '2026-04-14 07:00:00',
  },
  {
    id: 'snap-w09',
    periodType: 'weekly' as const,
    periodStart: '2026-04-14', periodEnd: '2026-04-20',
    tagSummaries: ts([
      ['AI',    2, 0, 'レート制限の問題を解決し、抽出ロジックが安定稼働するようになった。大きな前進', '', 'RL問題解決'],
      ['副業',  1, 0, 'バグを直したときの達成感は格別。先週の停滞があったからこそ喜びが大きい', '', 'バグ解消↑'],
      ['本業',  0, 1, '', '上司から「副業の時間を本業に使え」と遠回しに言われ、モチベーションが下がった', '副業横やり'],
    ]),
    createdAt: '2026-04-21 07:00:00',
  },
  {
    id: 'snap-w08',
    periodType: 'weekly' as const,
    periodStart: '2026-04-21', periodEnd: '2026-04-27',
    tagSummaries: ts([
      ['副業',  1, 0, '副業で新規クライアントからの問い合わせが来た。紹介での獲得で、信頼の連鎖を感じた', '', '新規問合せ'],
      ['家族',  2, 0, '週末に家族で公園に行き、子どもが初めて「パパ」と言った。仕事も副業も全部報われた気がした', '', '「パパ」↑'],
    ]),
    createdAt: '2026-04-28 07:00:00',
  },
  {
    id: 'snap-w07',
    periodType: 'weekly' as const,
    periodStart: '2026-04-28', periodEnd: '2026-05-04',
    tagSummaries: ts([
      ['副業',  1, 0, 'GW前半に集中してアーキテクチャの見直しをした。コンポーネント設計が整理された', '', '設計整理'],
      ['AI',    1, 0, 'スナップショット生成ロジックのプロトタイプが動いた。方向性の正しさを確信', '', '生成動作確認'],
      ['心理',  1, 0, 'まとまった時間で開発できるGWは最高。副業・本業の疲れがリセットされた', '', 'GWで回復'],
    ]),
    createdAt: '2026-05-05 07:00:00',
  },
  {
    id: 'snap-w06',
    periodType: 'weekly' as const,
    periodStart: '2026-05-05', periodEnd: '2026-05-11',
    tagSummaries: ts([
      ['AI',    2, 0, 'GW後半でチャット機能とインポート機能の主要部分が完成した。アプリとしての形が見えてきた', '', '主要機能完成'],
      ['副業',  2, 0, 'プロトタイプを自分で使ってみたら、過去の自分を客観視できて面白かった。GWに副業収入の計算をしたら独立可能なラインに近づいていた', '', '客観視・独立近'],
      ['転職',  1, 0, 'GWに副業収入の計算をしたら、年換算で独立可能なラインに近づいていた', '', '独立ライン近'],
    ]),
    createdAt: '2026-05-12 07:00:00',
  },
  {
    id: 'snap-w05',
    periodType: 'weekly' as const,
    periodStart: '2026-05-12', periodEnd: '2026-05-18',
    tagSummaries: ts([
      ['本業',  0, 2, '', 'GW明けの仕事がつらく感じた。同僚との温度差が気になった', 'GW明け辛'],
      ['心理',  0, 1, '', 'GW中の充実感との落差で、月曜の会社が余計に苦しく感じた', '落差疲弊'],
      ['AI',    1, 0, 'それでも夜の開発時間が救いになっている。モチベーションの切り替えができるようになった', '', '開発が救い'],
    ]),
    createdAt: '2026-05-19 07:00:00',
  },
  {
    id: 'snap-w04',
    periodType: 'weekly' as const,
    periodStart: '2026-05-19', periodEnd: '2026-05-25',
    tagSummaries: ts([
      ['剣道',  0, 1, '', '久しぶりの試合で一回戦負け。稽古不足を痛感した', '1回戦負け'],
      ['本業',  0, 1, '', 'プロジェクトの方向転換で余計な仕事が増えた', '仕事増加'],
      ['AI',    1, 0, 'MY AGENTのUI部分を集中的に作り、デザインが固まってきた', '', 'UIデザイン固'],
    ]),
    createdAt: '2026-05-26 07:00:00',
  },
  {
    id: 'snap-w03',
    periodType: 'weekly' as const,
    periodStart: '2026-05-26', periodEnd: '2026-06-01',
    tagSummaries: ts([
      ['副業',  3, 0, '副業の月収が過去最高を更新。3社継続・1社新規で月15万円に到達した。収入増に合わせて投資も計画的に実行できた', '', '月15万達成'],
      ['家族',  1, 0, 'パートナーと副業の進捗を共有し、来年の独立スケジュールについて話し合えた', '', '独立計画共有'],
      ['転職',  1, 0, '「転職」より「独立」への気持ちが完全に固まった週', '', '独立確定'],
    ]),
    createdAt: '2026-06-02 07:00:00',
  },
  {
    id: 'snap-w02',
    periodType: 'weekly' as const,
    periodStart: '2026-06-02', periodEnd: '2026-06-08',
    tagSummaries: ts([
      ['副業',  1, 0, 'タイムライン可視化UIの設計を開始。どう見せるかを考えるのが楽しかった', '', 'TL設計開始'],
      ['AI',    1, 0, 'タグサマリーの生成ロジックが完成。データの流れが全部つながった', '', '生成完成'],
      ['本業',  0, 1, '', '評価制度の不透明さに改めて不満を感じた。独立への動機づけになっている', '制度不満'],
    ]),
    createdAt: '2026-06-09 07:00:00',
  },
  {
    id: 'snap-w01',
    periodType: 'weekly' as const,
    periodStart: '2026-06-09', periodEnd: '2026-06-15',
    tagSummaries: ts([
      ['AI',    1, 0, 'MY AGENTの記憶可視化機能が完成に近づき、ツールの価値を実感できた', '', '可視化完成'],
      ['副業',  1, 0, '自分のアイデアがプロダクトとして動いている充実感が大きい', '', '充実感大'],
      ['本業',  0, 1, '', '評価が不透明で疲弊。転職を本格的に検討し始めている', '評価疲弊'],
      ['転職',  0, 1, '', '職場への不満が増大。ただし焦りはなく冷静に選択肢を考えられている', '独立一択'],
    ]),
    createdAt: '2026-06-16 07:00:00',
  },

  // ────────────────────────────────────
  // 月次 (M12〜M01: 2025-07 〜 2026-06)
  // ────────────────────────────────────
  {
    id: 'snap-m12',
    periodType: 'monthly' as const,
    periodStart: '2025-07-01', periodEnd: '2025-07-31',
    tagSummaries: ts([
      ['副業',  3, 0, '副業月収が初めて5万円を超えた。2社の継続契約で安定感が出てきた。副業収入を全額貯蓄に回せた', '', '月5万超え'],
      ['AI',    1, 0, '業務効率化の提案でAIを積極的に使い、評価が上がった', '', '業務評価↑'],
      ['本業',  0, 1, '', '夏の長時間労働と副業の疲れが重なり、体力的にきつかった', '夏疲労'],
    ]),
    createdAt: '2025-08-01 09:00:00',
  },
  {
    id: 'snap-m11',
    periodType: 'monthly' as const,
    periodStart: '2025-08-01', periodEnd: '2025-08-31',
    tagSummaries: ts([
      ['副業',  3, 0, '副業2件目のプロジェクトが軌道に乗り始めた。固定費の見直しで月2万円の削減にも成功', '', '2件軌道'],
      ['家族',  1, 0, '長野旅行で移住への具体的なイメージが湧いた。パートナーも前向きになった', '', '移住↑'],
      ['AI',    1, 0, 'Webアプリを個人で初めて公開した。技術的な自信がついた', '', '初公開↑'],
    ]),
    createdAt: '2025-09-01 09:00:00',
  },
  {
    id: 'snap-m10',
    periodType: 'monthly' as const,
    periodStart: '2025-09-01', periodEnd: '2025-09-30',
    tagSummaries: ts([
      ['家族',  1, 0, '移住候補地を絞り込み、長野・松本エリアを第一候補に決めた', '', '松本候補地'],
      ['剣道',  1, 0, '半年ぶりに道場に復帰。仲間との再会が精神的な支えになった', '', '道場復帰'],
      ['転職',  0, 1, '', '転職エージェントに登録したが、求人を見るたびに「ここじゃない感」があった', 'ここじゃない'],
      ['本業',  0, 1, '', '本業への意欲が低下していることを自覚し始めた', '意欲低下'],
    ]),
    createdAt: '2025-10-01 09:00:00',
  },
  {
    id: 'snap-m09',
    periodType: 'monthly' as const,
    periodStart: '2025-10-01', periodEnd: '2025-10-31',
    tagSummaries: ts([
      ['転職',  0, 1, '', '転職活動を開始したが、方向性の迷いが面接に出てしまった', '活動迷走'],
      ['家族',  0, 1, '', '親が体調を崩したと連絡。帰省で仕事・副業とも止まった週があった', '親体調不良'],
      ['AI',    1, 0, 'AIマーケティングのセミナーに初登壇。緊張したが高評価を得られた', '', '初登壇↑'],
      ['剣道',  1, 0, '道場での稽古が週1回のルーティンになり、体力・精神力が戻ってきた', '', '週1習慣化'],
    ]),
    createdAt: '2025-11-01 09:00:00',
  },
  {
    id: 'snap-m08',
    periodType: 'monthly' as const,
    periodStart: '2025-11-01', periodEnd: '2025-11-30',
    tagSummaries: ts([
      ['転職',  1, 1, '2社の面接で不合格だったが、「転職より独立」という確信につながった', '面接落ちがダメージになった時期もあった', '独立確信へ'],
      ['本業',  0, 2, '', '年末評価で昇格見送り。組織への帰属意識が完全に薄れた', '昇格見送り'],
      ['AI',    2, 0, 'セミナー登壇をきっかけにフォロワーが増え、副業案件の問い合わせが来るようになった', '', 'フォロワー増'],
      ['副業',  1, 0, '副業収入が月8万円に到達。本業の手取りの40%に相当する規模になった', '', '月8万達成'],
    ]),
    createdAt: '2025-12-01 09:00:00',
  },
  {
    id: 'snap-m07',
    periodType: 'monthly' as const,
    periodStart: '2025-12-01', periodEnd: '2025-12-31',
    tagSummaries: ts([
      ['AI',    3, 0, '「過去の会話履歴から自分の変化を可視化するツール」のアイデアを思いついた。これがMY AGENTの原型', '', 'MYAGENT着想'],
      ['副業',  2, 0, '年末年始の連休を使って最初のプロトタイプを作り始めた。技術的には見通しが立った', '', '原型開始'],
      ['家族',  1, 0, '来年の独立に向けてパートナーと具体的な財務計画を立てた。二人で同じ方向を向けている', '', '独立計画↑'],
      ['転職',  1, 0, '転職活動を正式に終了し、独立一本に絞ることをパートナーに宣言した', '', '活動終了'],
    ]),
    createdAt: '2026-01-01 09:00:00',
  },
  {
    id: 'snap-m06',
    periodType: 'monthly' as const,
    periodStart: '2026-01-01', periodEnd: '2026-01-31',
    tagSummaries: ts([
      ['AI',    3, 0, 'MY AGENTの開発を本格スタート。Nuxt 4 + Cloudflare D1の技術スタックが固まった', '', '開発本格化'],
      ['副業',  3, 0, '年始から「1日1機能」のペースで実装が進んでいる。独立タイムラインが見えてきた', '', '1日1機能'],
      ['家族',  1, 0, '育児が落ち着いてきた。子どもと過ごす時間を大切にしながら開発する習慣ができた', '', '育児×開発'],
    ]),
    createdAt: '2026-02-01 09:00:00',
  },
  {
    id: 'snap-m05',
    periodType: 'monthly' as const,
    periodStart: '2026-02-01', periodEnd: '2026-02-28',
    tagSummaries: ts([
      ['家族',  2, 1, 'バレンタインを機に家事分担を見直し、関係が改善した', 'パートナーとの喧嘩も増えた時期。互いの疲れが蓄積していた', '成長と夜泣'],
      ['AI',    2, 0, '睡眠不足でも開発が楽しくて続けられた。プロトタイプが初めて自分で使えるレベルに', '', '不足でも前進'],
      ['副業',  1, 0, 'MY AGENTの初期バージョンが動いた。感動した', '', '初版完成'],
    ]),
    createdAt: '2026-03-01 09:00:00',
  },
  {
    id: 'snap-m04',
    periodType: 'monthly' as const,
    periodStart: '2026-03-01', periodEnd: '2026-03-31',
    tagSummaries: ts([
      ['転職',  1, 0, '転職エージェントをお断りした。独立への覚悟が固まった月', '', '断念→独立'],
      ['副業',  3, 0, '開発ペースが上がった。副業月収が初めて10万円を突破。覚悟が決まると行動が変わると実感', '', '月10万超'],
      ['AI',    2, 0, '副業月収が初めて10万円を突破。独立の現実味が増した', '', '月10万超'],
      ['心理',  1, 0, '迷いがなくなった月。不思議なほど精神的に安定していた', '', '迷い消えた'],
      ['家族',  1, 0, '長野の移住候補地を下見。リアルなイメージができてきた', '', '下見実施'],
    ]),
    createdAt: '2026-04-01 09:00:00',
  },
  {
    id: 'snap-m03',
    periodType: 'monthly' as const,
    periodStart: '2026-04-01', periodEnd: '2026-04-30',
    tagSummaries: ts([
      ['AI',    3, 0, 'APIプロトタイプが安定稼働。マーケティング提案も社内で好評だった', '', 'API安定'],
      ['副業',  3, 0, '技術的な壁を越えた週あり、達成感が大きかった。AI×マーケの強みを社内外で発揮できている', '', '技術壁越え'],
      ['本業',  0, 2, '', '新プロジェクトで上司との価値観の差を感じ、消耗した', '価値観ズレ'],
    ]),
    createdAt: '2026-05-01 09:00:00',
  },
  {
    id: 'snap-m02',
    periodType: 'monthly' as const,
    periodStart: '2026-05-01', periodEnd: '2026-05-31',
    tagSummaries: ts([
      ['AI',    4, 0, 'GW中の集中開発でMY AGENTの主要機能が完成。副業でも高評価', '', '主要機能完'],
      ['副業',  5, 0, 'プロダクトを自分で使うループが回り始めた。副業月収が過去最高の15万円に到達', '', '月15万最高'],
      ['本業',  0, 2, '', 'GW明けの反動で本業がつらかった。評価制度への不満も増大', '本業辛い'],
      ['剣道',  0, 1, '', '試合で一回戦負け。稽古不足を痛感', '試合負け'],
    ]),
    createdAt: '2026-06-01 09:00:00',
  },
  {
    id: 'snap-m01',
    periodType: 'monthly' as const,
    periodStart: '2026-06-01', periodEnd: '2026-06-15',
    tagSummaries: ts([
      ['AI',    3, 0, 'タイムライン可視化機能が完成。MY AGENTが本当に使えるツールになった', '', '可視化完成'],
      ['副業',  2, 0, '自分で作ったツールで自分を振り返る体験が面白い。プロダクトの価値を確信', '', '価値確信'],
      ['本業',  0, 2, '', '評価が不透明で疲弊。独立への動機が高まっている', '評価疲弊'],
      ['転職',  0, 1, '', '転職ではなく独立。この気持ちは揺るがない', '独立一択'],
      ['家族',  1, 0, 'パートナーと独立後の生活をより具体的に話せるようになった', '', '独立話進む'],
    ]),
    createdAt: '2026-06-19 09:00:00',
  },

  // ────────────────────────────────────
  // 年次 (Y05=2021 〜 Y01=2025)
  // ────────────────────────────────────
  {
    id: 'snap-y05',
    periodType: 'yearly' as const,
    periodStart: '2021-01-01', periodEnd: '2021-12-31',
    tagSummaries: ts([
      ['剣道',  4, 0, '社会人剣道に本格参加し、地区大会でベスト8入り。道場の仲間との絆が深まった。仕事よりも剣道が生きがいだった時期', '', 'ベスト8入り'],
      ['本業',  2, 1, '入社5年目で業務に自信が持てるようになり、後輩指導も任された', '組織の理不尽さを感じることも増えてきた', '自信ついた'],
      ['心理',  1, 1, '社会人としての自分が形成されてきた年。自分は何をしたいのかを考え始めた', '将来への漠然とした不安もあった', '将来を模索'],
      ['家族',  1, 0, '実家の両親と久しぶりにゆっくり話せた帰省があった。感謝を伝えられた', '', '感謝伝えた'],
    ]),
    createdAt: '2022-01-05 09:00:00',
  },
  {
    id: 'snap-y04',
    periodType: 'yearly' as const,
    periodStart: '2022-01-01', periodEnd: '2022-12-31',
    tagSummaries: ts([
      ['本業',  4, 0, 'マーケティング部門への異動が転機。仕事が面白くなり、初めてやりがいを感じた一年', '', 'やりがい発見'],
      ['副業',  5, 0, 'SNSマーケティングとコンテンツ戦略を担当し、成果が数字で見えた。自分の強みを発見できた年。投資信託の積み立てもスタート', '', '強み発見'],
      ['家族',  3, 1, '結婚した。二人の生活が始まり、幸福度が上がった年', '生活習慣や金銭感覚の違いで衝突することもあった', '結婚↑'],
      ['剣道',  2, 0, '段位取得（三段）。稽古の質が上がってきた', '', '三段取得'],
    ]),
    createdAt: '2023-01-05 09:00:00',
  },
  {
    id: 'snap-y03',
    periodType: 'yearly' as const,
    periodStart: '2023-01-01', periodEnd: '2023-12-31',
    tagSummaries: ts([
      ['AI',    5, 0, 'ChatGPT登場で人生が変わった年。仕事での活用を始め、生産性が劇的に上がった。AIへの本格的な興味が芽生えた', '', 'ChatGPT衝撃'],
      ['副業',  5, 0, 'AI×マーケティングの組み合わせが強力だと気づき、AIを使った簡単なツールを作り始めた。プログラミングへの興味が再燃', '', 'AI×副業強み'],
      ['本業',  1, 2, '', '評価は上がったが、会社の方向性と自分のやりたいことのずれを感じ始めた', '方向性ズレ'],
      ['転職',  0, 1, '', 'なんとなく転職を考え始めたが、まだ行動には至らなかった', '転職検討始'],
    ]),
    createdAt: '2024-01-05 09:00:00',
  },
  {
    id: 'snap-y02',
    periodType: 'yearly' as const,
    periodStart: '2024-01-01', periodEnd: '2024-12-31',
    tagSummaries: ts([
      ['家族',  4, 3, '子どもが生まれた。人生最大の喜びと想像以上の大変さ。パートナーとの絆が深まる一方、余裕がないときの摩擦も多かった', '睡眠不足と仕事・副業との両立で体力的に限界を感じた', '出産↑大変'],
      ['AI',    4, 0, 'Claude API等を本格的に学習。副業に向けた技術力が急速に上がった年', '', '技術力急伸'],
      ['転職',  1, 1, '転職エージェントに登録し、情報収集した', '「転職か独立か」の間で揺れ続けた年', '独立か迷い'],
      ['副業',  2, 0, '育児費用の増加に備えた節約と、副業への先行投資を両立させた', '', '先行投資↑'],
      ['本業',  0, 3, '', '育休明けの職場の雰囲気に違和感。副業・個人開発に力を入れるほど、本業への熱量が落ちていった', '熱量低下'],
    ]),
    createdAt: '2025-01-05 09:00:00',
  },
  {
    id: 'snap-y01',
    periodType: 'yearly' as const,
    periodStart: '2025-01-01', periodEnd: '2025-12-31',
    tagSummaries: ts([
      ['AI',    6, 0, 'AI副業が軌道に乗り、年末には月収10万円を超えた。登壇・教材・コンサルと活動が広がった', '', '月10万達成'],
      ['副業',  7, 0, 'AI×マーケの専門家として副業で認知され、紹介案件が絶えない状態に。MY AGENTの構想が生まれプロトタイプ開発を開始。独立資金の目標額50%に到達', '', '副業全開'],
      ['転職',  2, 2, '転職活動を試みたが年末に断念し、独立路線へ完全シフト', '2社の面接落ちがあり、自信が揺らいだ時期も', '独立へ転換'],
      ['家族',  2, 0, '長野を中心に移住候補地の下見を行い、現実的な計画が立てられた', '', '移住計画↑'],
      ['本業',  0, 4, '', '年末評価での昇格見送りで会社への帰属意識がほぼ消えた。独立の最終的な動機付けになった', '帰属感消滅'],
    ]),
    createdAt: '2026-01-05 09:00:00',
  },

  // ────────────────────────────────────
  // 手動（3ヶ月振り返り）
  // ────────────────────────────────────
  {
    id: 'snap-manual-001',
    periodType: 'manual' as const,
    periodStart: '2026-04-01', periodEnd: '2026-06-15',
    tagSummaries: ts([
      ['AI',    5, 0, 'この3ヶ月でAIへの理解と実践力が大きく伸びた。副業・プロダクト開発の両面で成果が出始めている', '', '副業×開発↑'],
      ['転職',  1, 2, '副業が軌道に乗ってきて焦らず転職を考えられるようになった', '現職への不満は蓄積しており、意思決定が必要な段階に来ている', '独立か迷い'],
      ['副業',  4, 0, 'プロダクトを0→1で作る経験を通じて、開発の自信と楽しさを取り戻した。AI×マーケの強みを社内外で発揮できている', '', '0→1経験'],
      ['本業',  0, 2, '', '評価・方向性への不満が継続。これが転職・独立を考える主なドライバーになっている', '不満継続'],
      ['剣道',  0, 1, '', '仕事・副業が優先になり稽古時間が確保できていない。優先度の再考が必要', '稽古不足'],
      ['家族',  1, 0, 'パートナーと将来のライフプランを話せるようになってきた。副業が会話を生んでいる', '', '計画共有'],
    ]),
    createdAt: '2026-06-16 10:00:00',
  },
]
