/**
 * メニューアプリ用のスプレッドシートを整える（何度実行しても大丈夫）。
 *
 * 使い方:
 *   1. スプレッドシートを開き、メニューの「拡張機能」→「Apps Script」
 *   2. 最初からあるコードを全部消して、このファイルの中身を貼り付けて保存
 *   3. 上の関数の選択が「setupMenuApp」になっていることを確認して「実行」
 *      （初回だけ Google の許可画面が出るので、自分のアカウントで許可する）
 *
 * やること:
 *   - 「使い方」シートを一番左に作る（店長向けの説明。ハンディには出ない）
 *   - 「設定」シートが無ければ作る（ハンディ下部のタブの一覧）
 *   - アプリが名前で見分けている見出しのセルを保護する（編集しようとすると警告が出る）
 *   新しいタブを足したり、列を足したりしたあとにもう一度実行すると、保護も付け直される。
 */

const PROTECT_PREFIX = 'メニューアプリ:';
const RE_CAT = /^(カテゴリ|カテゴリー|分類)$/;
const RE_PRICE = /値段|価格|料金|金額/;

const DEFAULT_TABS = [
  ['ドリンク', 'ドリンク'],
  ['フード', 'フード'],
  ['ハンディーに無いもの・値段', 'ハンディーに\n無いもの・値段'],
  ['接客マニュアル動画、テーブルセット', 'マニュアル'],
];

const HELP = [
  '#このシートの使い方（このシートはハンディには表示されません）',
  '',
  '■ 基本',
  'ハンディのメニューアプリは、このスプレッドシートの内容をそのまま表示します。書き換えると、ハンディ右上の更新ボタンを押すか、10分たつと反映されます。',
  '各シートの1行目は「見出し」です。見出しの名前がそのままハンディの項目名になります。',
  '',
  '■ 自由にしてよいこと',
  '・列を追加する → 見出しの名前で新しい項目として表示されます。',
  '・列の順番を入れ替える → ハンディでも同じ順番で表示されます。',
  '・見出しの名前を変える → ハンディの項目名も変わります（下の「特別な見出し」を除く）。',
  '・見出しの名前を「#」で始める → その列はハンディに表示されません（店長用のメモ欄に使えます）。',
  '・見出しのセル内で改行した2行目以降 → ハンディには出ません（入力する人へのメモに使えます）。',
  '',
  '■ 特別な見出し（保護されています。変えると表示のされ方が変わります）',
  '・「カテゴリ」：この列があると、ハンディでは最初にカテゴリの一覧が出ます。同じカテゴリが続くときは、2行目以降は空欄で大丈夫です。',
  '・「値段」（「価格」「料金」「金額」でも可）：カードの右上に値段として表示されます。',
  '・カテゴリと値段以外で一番左の列：カードの見出し（商品名など）になります。',
  '',
  '■ 色が付く見出し（見出しの名前にこの言葉が入っていると強調されます）',
  '・赤：注意／アレルギー／その他',
  '・黄緑：接客／トーク／声かけ／分量',
  '・茶：付ける／つける／タレ／薬味',
  '',
  '■ 画像・動画',
  '・セルに画像や YouTube のリンクを書くと、画像・動画として表示されます。',
  '・接客マニュアル動画は「ファイル名.mp4」と書きます（動画ファイルの追加は担当者が行います）。',
  '',
  '■ ハンディ下部のタブを増やす・並べ替える',
  '・新しいシートを作り、1行目に見出しを書きます。',
  '・「設定」シートの A列にシート名（シートの下のタブに書いてある名前と完全に同じ）、B列にハンディに表示する名前を書きます。',
  '・「設定」シートの上から順に、ハンディの左から並びます。4〜5個までがおすすめです。',
  '・B列でセル内改行（Alt+Enter）すると、タブの名前も改行されます。',
  '・シート名を間違えると、ハンディに「シートが見つかりません」と出ます。',
  '・タブや列を足したら、「拡張機能」→「Apps Script」で setupMenuApp をもう一度実行すると、保護も付け直されます。',
  '',
  '■ してはいけないこと',
  '・「使い方」「設定」シートの名前を変える、または消す。',
  '・「使い方」シートを一番左から動かす。',
];

function setupMenuApp() {
  const ss = SpreadsheetApp.getActive();

  // 以前この関数で付けた保護を外してから付け直す
  ss.getProtections(SpreadsheetApp.ProtectionType.RANGE)
    .concat(ss.getProtections(SpreadsheetApp.ProtectionType.SHEET))
    .filter(p => (p.getDescription() || '').indexOf(PROTECT_PREFIX) === 0)
    .forEach(p => p.remove());

  // 使い方（一番左に置く。アプリはシート名の間違いをこのシートで見分ける）
  let help = ss.getSheetByName('使い方');
  if (!help) help = ss.insertSheet('使い方', 0);
  help.clear();
  help.getRange(1, 1, HELP.length, 1).setValues(HELP.map(t => [t]));
  help.getRange(1, 1).setFontWeight('bold').setFontSize(12);
  help.setColumnWidth(1, 900);
  help.getRange(1, 1, HELP.length, 1).setWrap(true);
  ss.setActiveSheet(help);
  ss.moveActiveSheet(1);
  help.protect().setDescription(PROTECT_PREFIX + '使い方').setWarningOnly(true);

  // 設定
  let conf = ss.getSheetByName('設定');
  if (!conf) {
    conf = ss.insertSheet('設定', 1);
    conf.getRange(1, 1, 1, 2).setValues([['シート名', 'タブの表示名']]).setFontWeight('bold');
    conf.getRange(2, 1, DEFAULT_TABS.length, 2).setValues(DEFAULT_TABS);
    conf.setFrozenRows(1);
    conf.setColumnWidth(1, 280);
    conf.setColumnWidth(2, 200);
  }
  conf.getRange('A1:B1').protect().setDescription(PROTECT_PREFIX + '設定の見出し').setWarningOnly(true);

  // 各タブの特別な見出し
  const last = conf.getLastRow();
  const names = last > 1 ? conf.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]).trim()).filter(String) : [];
  const missing = [];
  names.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) { missing.push(name); return; }
    const width = sh.getLastColumn();
    if (width < 1) return;
    sh.getRange(1, 1, 1, width).getValues()[0].forEach((h, i) => {
      const label = String(h).split('\n')[0].trim();
      if (RE_CAT.test(label) || RE_PRICE.test(label)) {
        sh.getRange(1, i + 1).protect()
          .setDescription(PROTECT_PREFIX + name + '「' + label + '」')
          .setWarningOnly(true);
      }
    });
  });

  SpreadsheetApp.getUi().alert(missing.length
    ? '完了しました。ただし「設定」に書かれた次のシートが見つかりません：\n' + missing.join('\n')
    : '完了しました。');
}
