# デプロイ手順（GitHub Pages）

## sumi.musikaroid.com（メイン）
1. この `site/` の中身（musikaroid/ フォルダ以外を推奨、含めても動く）を `sumi-music/sumi-site` のルートにコミット & push
2. リポジトリ Settings → Pages → Branch: main / (root) を選択
3. カスタムドメイン: `sumi.musikaroid.com` を設定（ルートに `CNAME` ファイルとして保存される）
4. DNS側: `sumi` の CNAME レコードを `<user>.github.io` に向ける

## musikaroid.com（1枚もの・別サイト）
- `site/musikaroid/index.html` を別リポジトリ（例: musikaroid-site）のルートに置く
- その際、`../style.css` `../main.js` `../assets/...` の参照を同リポジトリにコピーして `style.css` 等に書き換えること
- 同じドメインのサブパス（sumi.musikaroid.com/musikaroid/）で公開するなら、そのままで動く

## 日々の更新（commitだけで反映・ビルド不要）
- 新曲: `discography.json` に1エントリ追加
  （id / title / title_en / date / type / tags / tcid / apple / spotify / jacket / url）
  - jacket: `https://www.tunecore.co.jp/s3pna/tcj-image-production/u580179/r{tcid}/itd{tcid}.png`
  - apple / spotify はアルバムID（無ければ省略→linkco.reプレーヤーにフォールバック）
- ニュース: `posts.json` の先頭に `{date, title, title_en}` を追加。`rss.xml` にも1 item追加
- MV: `videos.json` にYouTube IDを1行追加
- カウントダウンは discography.json の未来日付から自動。過ぎたら自動で次の曲へ／無ければ非表示

## 未対応（v2）
- 曲別ページ、PWA（manifest / Service Worker）、Xタイムライン埋め込み、WebGL水面
