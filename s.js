/*
    Ce script permet de générer un QRCode du contenu de la page
    Une fois imprimée, la page peut ainsi être "renumérisée"
    
    ATTENTION: Ne pas déplacer ce fichier au risque de ne plus faire fonctionner les pages déjà imprimée
    (celle-ci ne généreront plus à leur tour le QRCode )

*/
let d = document, $$ = s => d.querySelectorAll(s), $ = s => $$(s)[0], h = $("html").outerHTML, Q;
s = d.createElement('script');
s.src = "https://cdn.jsdelivr.net/npm/qrcode-svg@1.1.0/dist/qrcode.min.js";
Q = d.createElement('b');
Q.className = "qrcode q1";
$('main div.e').prepend(Q);
Q = d.createElement('b');
Q.className = "qrcode q2";
$$('h2')[2].after(Q);
s.onload = () => {
    s = new CompressionStream('gzip');
    w = s.writable.getWriter();
    w.write((new TextEncoder).encode(
        '<!DOCTYPE html>' +
        h
            .replace(/\s+/g, " ")
            .replace(/><\/(path|use)>/g, '/>')
            .replace(/<\/li>/g, '')
            .replace(/&nbsp;/g, '\u00A0')
    ));
    w.close();
    new Response(s.readable)
        .arrayBuffer()
        .then(b => { b = `data:text/html,<a href='data:application/octet-stream;base64,${btoa(String.fromCharCode.apply(String, new Uint8Array(b)))}' download='model.htm.gz'>model</a>`; console.log(b); return b })
        .then(b => new QRCode({
            content: b,
            join: !0,
            container: 'svg-viewbox',
            ecl: 'L'
        }).svg())
        .then(b => d.querySelectorAll('.qrcode').forEach(Q => Q.innerHTML = b));
    let f = "<summary>Format d'impression</summary>";
    Object.entries({
        C: "240mm 320mm",
        A3: "297mm 420mm",
        A4: "210mm 297mm"
    })
        .forEach(([k, v]) =>
            f += ` <label><input type="radio" name="s" checked onclick="d.body.className='${k}';$$('style')[1].innerText='@page{size:${v};margin:0}'"> ${k} (${v})</label>`);
    let D = d.createElement('details');
    D.innerHTML = f;
    d.body.prepend(D);
    $('input[name="s"]:checked')?.onclick()
};
$('head').appendChild(s);
s = d.createElement('style');
s.innerText += ".q1 svg{height:110mm;width:110mm;margin:1mm 0 0 1mm;stroke:none}.q2 svg{height:135mm;width:135mm;margin:0px 0 0 -21mm;stroke:none}";
$('head').appendChild(s);
