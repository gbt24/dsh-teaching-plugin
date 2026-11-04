window.__ModuleLoader__.load({
  id: "dsh-ai-teaching",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name2 in all)
        __defProp(target, name2, { get: all[name2], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

    // packages/dsh-plugin/src/client/index.tsx
    var index_exports = {};
    __export(index_exports, {
      PANEL_ID: () => PANEL_ID,
      apply: () => apply,
      inject: () => inject,
      name: () => name
    });
    module.exports = __toCommonJS(index_exports);
    var import_react11 = __toESM(require("react"), 1);

    // node_modules/.pnpm/katex@0.16.47/node_modules/katex/dist/katex.min.css
    var katex_min_default = '@font-face{font-display:block;font-family:KaTeX_AMS;font-style:normal;font-weight:400;src:url(fonts/KaTeX_AMS-Regular.woff2) format("woff2"),url(fonts/KaTeX_AMS-Regular.woff) format("woff"),url(fonts/KaTeX_AMS-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Caligraphic;font-style:normal;font-weight:700;src:url(fonts/KaTeX_Caligraphic-Bold.woff2) format("woff2"),url(fonts/KaTeX_Caligraphic-Bold.woff) format("woff"),url(fonts/KaTeX_Caligraphic-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Caligraphic;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Caligraphic-Regular.woff2) format("woff2"),url(fonts/KaTeX_Caligraphic-Regular.woff) format("woff"),url(fonts/KaTeX_Caligraphic-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Fraktur;font-style:normal;font-weight:700;src:url(fonts/KaTeX_Fraktur-Bold.woff2) format("woff2"),url(fonts/KaTeX_Fraktur-Bold.woff) format("woff"),url(fonts/KaTeX_Fraktur-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Fraktur;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Fraktur-Regular.woff2) format("woff2"),url(fonts/KaTeX_Fraktur-Regular.woff) format("woff"),url(fonts/KaTeX_Fraktur-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:normal;font-weight:700;src:url(fonts/KaTeX_Main-Bold.woff2) format("woff2"),url(fonts/KaTeX_Main-Bold.woff) format("woff"),url(fonts/KaTeX_Main-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:italic;font-weight:700;src:url(fonts/KaTeX_Main-BoldItalic.woff2) format("woff2"),url(fonts/KaTeX_Main-BoldItalic.woff) format("woff"),url(fonts/KaTeX_Main-BoldItalic.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:italic;font-weight:400;src:url(fonts/KaTeX_Main-Italic.woff2) format("woff2"),url(fonts/KaTeX_Main-Italic.woff) format("woff"),url(fonts/KaTeX_Main-Italic.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Main-Regular.woff2) format("woff2"),url(fonts/KaTeX_Main-Regular.woff) format("woff"),url(fonts/KaTeX_Main-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Math;font-style:italic;font-weight:700;src:url(fonts/KaTeX_Math-BoldItalic.woff2) format("woff2"),url(fonts/KaTeX_Math-BoldItalic.woff) format("woff"),url(fonts/KaTeX_Math-BoldItalic.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Math;font-style:italic;font-weight:400;src:url(fonts/KaTeX_Math-Italic.woff2) format("woff2"),url(fonts/KaTeX_Math-Italic.woff) format("woff"),url(fonts/KaTeX_Math-Italic.ttf) format("truetype")}@font-face{font-display:block;font-family:"KaTeX_SansSerif";font-style:normal;font-weight:700;src:url(fonts/KaTeX_SansSerif-Bold.woff2) format("woff2"),url(fonts/KaTeX_SansSerif-Bold.woff) format("woff"),url(fonts/KaTeX_SansSerif-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:"KaTeX_SansSerif";font-style:italic;font-weight:400;src:url(fonts/KaTeX_SansSerif-Italic.woff2) format("woff2"),url(fonts/KaTeX_SansSerif-Italic.woff) format("woff"),url(fonts/KaTeX_SansSerif-Italic.ttf) format("truetype")}@font-face{font-display:block;font-family:"KaTeX_SansSerif";font-style:normal;font-weight:400;src:url(fonts/KaTeX_SansSerif-Regular.woff2) format("woff2"),url(fonts/KaTeX_SansSerif-Regular.woff) format("woff"),url(fonts/KaTeX_SansSerif-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Script;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Script-Regular.woff2) format("woff2"),url(fonts/KaTeX_Script-Regular.woff) format("woff"),url(fonts/KaTeX_Script-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Size1;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size1-Regular.woff2) format("woff2"),url(fonts/KaTeX_Size1-Regular.woff) format("woff"),url(fonts/KaTeX_Size1-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Size2;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size2-Regular.woff2) format("woff2"),url(fonts/KaTeX_Size2-Regular.woff) format("woff"),url(fonts/KaTeX_Size2-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Size3;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size3-Regular.woff2) format("woff2"),url(fonts/KaTeX_Size3-Regular.woff) format("woff"),url(fonts/KaTeX_Size3-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Size4;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size4-Regular.woff2) format("woff2"),url(fonts/KaTeX_Size4-Regular.woff) format("woff"),url(fonts/KaTeX_Size4-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Typewriter;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Typewriter-Regular.woff2) format("woff2"),url(fonts/KaTeX_Typewriter-Regular.woff) format("woff"),url(fonts/KaTeX_Typewriter-Regular.ttf) format("truetype")}.katex{font:normal 1.21em KaTeX_Main,Times New Roman,serif;line-height:1.2;position:relative;text-indent:0;text-rendering:auto}.katex *{-ms-high-contrast-adjust:none!important;border-color:currentColor}.katex .katex-version:after{content:"0.16.47"}.katex .katex-mathml{border:0;-webkit-clip-path:inset(50%);clip-path:inset(50%);height:1px;overflow:hidden;padding:0;position:absolute;width:1px}.katex .katex-html>.newline{display:block}.katex .base{position:relative;white-space:nowrap;width:-webkit-min-content;width:-moz-min-content;width:min-content}.katex .base,.katex .strut{display:inline-block}.katex .textbf{font-weight:700}.katex .textit{font-style:italic}.katex .textrm{font-family:KaTeX_Main}.katex .textsf{font-family:KaTeX_SansSerif}.katex .texttt{font-family:KaTeX_Typewriter}.katex .mathnormal{font-family:KaTeX_Math;font-style:italic}.katex .mathit{font-family:KaTeX_Main;font-style:italic}.katex .mathrm{font-style:normal}.katex .mathbf{font-family:KaTeX_Main;font-weight:700}.katex .boldsymbol{font-family:KaTeX_Math;font-style:italic;font-weight:700}.katex .amsrm,.katex .mathbb,.katex .textbb{font-family:KaTeX_AMS}.katex .mathcal{font-family:KaTeX_Caligraphic}.katex .mathfrak,.katex .textfrak{font-family:KaTeX_Fraktur}.katex .mathboldfrak,.katex .textboldfrak{font-family:KaTeX_Fraktur;font-weight:700}.katex .mathtt{font-family:KaTeX_Typewriter}.katex .mathscr,.katex .textscr{font-family:KaTeX_Script}.katex .mathsf,.katex .textsf{font-family:KaTeX_SansSerif}.katex .mathboldsf,.katex .textboldsf{font-family:KaTeX_SansSerif;font-weight:700}.katex .mathitsf,.katex .mathsfit,.katex .textitsf{font-family:KaTeX_SansSerif;font-style:italic}.katex .mainrm{font-family:KaTeX_Main;font-style:normal}.katex .vlist-t{border-collapse:collapse;display:inline-table;table-layout:fixed}.katex .vlist-r{display:table-row}.katex .vlist{display:table-cell;position:relative;vertical-align:bottom}.katex .vlist>span{display:block;height:0;position:relative}.katex .vlist>span>span{display:inline-block}.katex .vlist>span>.pstrut{overflow:hidden;width:0}.katex .vlist-t2{margin-right:-2px}.katex .vlist-s{display:table-cell;font-size:1px;min-width:2px;vertical-align:bottom;width:2px}.katex .vbox{align-items:baseline;display:inline-flex;flex-direction:column}.katex .hbox{width:100%}.katex .hbox,.katex .thinbox{display:inline-flex;flex-direction:row}.katex .thinbox{max-width:0;width:0}.katex .msupsub{text-align:left}.katex .mfrac>span>span{text-align:center}.katex .mfrac .frac-line{border-bottom-style:solid;display:inline-block;width:100%}.katex .hdashline,.katex .hline,.katex .mfrac .frac-line,.katex .overline .overline-line,.katex .rule,.katex .underline .underline-line{min-height:1px}.katex .mspace{display:inline-block}.katex .smash{display:inline;line-height:0}.katex .clap,.katex .llap,.katex .rlap{position:relative;width:0}.katex .clap>.inner,.katex .llap>.inner,.katex .rlap>.inner{position:absolute}.katex .clap>.fix,.katex .llap>.fix,.katex .rlap>.fix{display:inline-block}.katex .llap>.inner{right:0}.katex .clap>.inner,.katex .rlap>.inner{left:0}.katex .clap>.inner>span{margin-left:-50%;margin-right:50%}.katex .rule{border:0 solid;display:inline-block;position:relative}.katex .hline,.katex .overline .overline-line,.katex .underline .underline-line{border-bottom-style:solid;display:inline-block;width:100%}.katex .hdashline{border-bottom-style:dashed;display:inline-block;width:100%}.katex .sqrt>.root{margin-left:.2777777778em;margin-right:-.5555555556em}.katex .fontsize-ensurer.reset-size1.size1,.katex .sizing.reset-size1.size1{font-size:1em}.katex .fontsize-ensurer.reset-size1.size2,.katex .sizing.reset-size1.size2{font-size:1.2em}.katex .fontsize-ensurer.reset-size1.size3,.katex .sizing.reset-size1.size3{font-size:1.4em}.katex .fontsize-ensurer.reset-size1.size4,.katex .sizing.reset-size1.size4{font-size:1.6em}.katex .fontsize-ensurer.reset-size1.size5,.katex .sizing.reset-size1.size5{font-size:1.8em}.katex .fontsize-ensurer.reset-size1.size6,.katex .sizing.reset-size1.size6{font-size:2em}.katex .fontsize-ensurer.reset-size1.size7,.katex .sizing.reset-size1.size7{font-size:2.4em}.katex .fontsize-ensurer.reset-size1.size8,.katex .sizing.reset-size1.size8{font-size:2.88em}.katex .fontsize-ensurer.reset-size1.size9,.katex .sizing.reset-size1.size9{font-size:3.456em}.katex .fontsize-ensurer.reset-size1.size10,.katex .sizing.reset-size1.size10{font-size:4.148em}.katex .fontsize-ensurer.reset-size1.size11,.katex .sizing.reset-size1.size11{font-size:4.976em}.katex .fontsize-ensurer.reset-size2.size1,.katex .sizing.reset-size2.size1{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size2.size2,.katex .sizing.reset-size2.size2{font-size:1em}.katex .fontsize-ensurer.reset-size2.size3,.katex .sizing.reset-size2.size3{font-size:1.1666666667em}.katex .fontsize-ensurer.reset-size2.size4,.katex .sizing.reset-size2.size4{font-size:1.3333333333em}.katex .fontsize-ensurer.reset-size2.size5,.katex .sizing.reset-size2.size5{font-size:1.5em}.katex .fontsize-ensurer.reset-size2.size6,.katex .sizing.reset-size2.size6{font-size:1.6666666667em}.katex .fontsize-ensurer.reset-size2.size7,.katex .sizing.reset-size2.size7{font-size:2em}.katex .fontsize-ensurer.reset-size2.size8,.katex .sizing.reset-size2.size8{font-size:2.4em}.katex .fontsize-ensurer.reset-size2.size9,.katex .sizing.reset-size2.size9{font-size:2.88em}.katex .fontsize-ensurer.reset-size2.size10,.katex .sizing.reset-size2.size10{font-size:3.4566666667em}.katex .fontsize-ensurer.reset-size2.size11,.katex .sizing.reset-size2.size11{font-size:4.1466666667em}.katex .fontsize-ensurer.reset-size3.size1,.katex .sizing.reset-size3.size1{font-size:.7142857143em}.katex .fontsize-ensurer.reset-size3.size2,.katex .sizing.reset-size3.size2{font-size:.8571428571em}.katex .fontsize-ensurer.reset-size3.size3,.katex .sizing.reset-size3.size3{font-size:1em}.katex .fontsize-ensurer.reset-size3.size4,.katex .sizing.reset-size3.size4{font-size:1.1428571429em}.katex .fontsize-ensurer.reset-size3.size5,.katex .sizing.reset-size3.size5{font-size:1.2857142857em}.katex .fontsize-ensurer.reset-size3.size6,.katex .sizing.reset-size3.size6{font-size:1.4285714286em}.katex .fontsize-ensurer.reset-size3.size7,.katex .sizing.reset-size3.size7{font-size:1.7142857143em}.katex .fontsize-ensurer.reset-size3.size8,.katex .sizing.reset-size3.size8{font-size:2.0571428571em}.katex .fontsize-ensurer.reset-size3.size9,.katex .sizing.reset-size3.size9{font-size:2.4685714286em}.katex .fontsize-ensurer.reset-size3.size10,.katex .sizing.reset-size3.size10{font-size:2.9628571429em}.katex .fontsize-ensurer.reset-size3.size11,.katex .sizing.reset-size3.size11{font-size:3.5542857143em}.katex .fontsize-ensurer.reset-size4.size1,.katex .sizing.reset-size4.size1{font-size:.625em}.katex .fontsize-ensurer.reset-size4.size2,.katex .sizing.reset-size4.size2{font-size:.75em}.katex .fontsize-ensurer.reset-size4.size3,.katex .sizing.reset-size4.size3{font-size:.875em}.katex .fontsize-ensurer.reset-size4.size4,.katex .sizing.reset-size4.size4{font-size:1em}.katex .fontsize-ensurer.reset-size4.size5,.katex .sizing.reset-size4.size5{font-size:1.125em}.katex .fontsize-ensurer.reset-size4.size6,.katex .sizing.reset-size4.size6{font-size:1.25em}.katex .fontsize-ensurer.reset-size4.size7,.katex .sizing.reset-size4.size7{font-size:1.5em}.katex .fontsize-ensurer.reset-size4.size8,.katex .sizing.reset-size4.size8{font-size:1.8em}.katex .fontsize-ensurer.reset-size4.size9,.katex .sizing.reset-size4.size9{font-size:2.16em}.katex .fontsize-ensurer.reset-size4.size10,.katex .sizing.reset-size4.size10{font-size:2.5925em}.katex .fontsize-ensurer.reset-size4.size11,.katex .sizing.reset-size4.size11{font-size:3.11em}.katex .fontsize-ensurer.reset-size5.size1,.katex .sizing.reset-size5.size1{font-size:.5555555556em}.katex .fontsize-ensurer.reset-size5.size2,.katex .sizing.reset-size5.size2{font-size:.6666666667em}.katex .fontsize-ensurer.reset-size5.size3,.katex .sizing.reset-size5.size3{font-size:.7777777778em}.katex .fontsize-ensurer.reset-size5.size4,.katex .sizing.reset-size5.size4{font-size:.8888888889em}.katex .fontsize-ensurer.reset-size5.size5,.katex .sizing.reset-size5.size5{font-size:1em}.katex .fontsize-ensurer.reset-size5.size6,.katex .sizing.reset-size5.size6{font-size:1.1111111111em}.katex .fontsize-ensurer.reset-size5.size7,.katex .sizing.reset-size5.size7{font-size:1.3333333333em}.katex .fontsize-ensurer.reset-size5.size8,.katex .sizing.reset-size5.size8{font-size:1.6em}.katex .fontsize-ensurer.reset-size5.size9,.katex .sizing.reset-size5.size9{font-size:1.92em}.katex .fontsize-ensurer.reset-size5.size10,.katex .sizing.reset-size5.size10{font-size:2.3044444444em}.katex .fontsize-ensurer.reset-size5.size11,.katex .sizing.reset-size5.size11{font-size:2.7644444444em}.katex .fontsize-ensurer.reset-size6.size1,.katex .sizing.reset-size6.size1{font-size:.5em}.katex .fontsize-ensurer.reset-size6.size2,.katex .sizing.reset-size6.size2{font-size:.6em}.katex .fontsize-ensurer.reset-size6.size3,.katex .sizing.reset-size6.size3{font-size:.7em}.katex .fontsize-ensurer.reset-size6.size4,.katex .sizing.reset-size6.size4{font-size:.8em}.katex .fontsize-ensurer.reset-size6.size5,.katex .sizing.reset-size6.size5{font-size:.9em}.katex .fontsize-ensurer.reset-size6.size6,.katex .sizing.reset-size6.size6{font-size:1em}.katex .fontsize-ensurer.reset-size6.size7,.katex .sizing.reset-size6.size7{font-size:1.2em}.katex .fontsize-ensurer.reset-size6.size8,.katex .sizing.reset-size6.size8{font-size:1.44em}.katex .fontsize-ensurer.reset-size6.size9,.katex .sizing.reset-size6.size9{font-size:1.728em}.katex .fontsize-ensurer.reset-size6.size10,.katex .sizing.reset-size6.size10{font-size:2.074em}.katex .fontsize-ensurer.reset-size6.size11,.katex .sizing.reset-size6.size11{font-size:2.488em}.katex .fontsize-ensurer.reset-size7.size1,.katex .sizing.reset-size7.size1{font-size:.4166666667em}.katex .fontsize-ensurer.reset-size7.size2,.katex .sizing.reset-size7.size2{font-size:.5em}.katex .fontsize-ensurer.reset-size7.size3,.katex .sizing.reset-size7.size3{font-size:.5833333333em}.katex .fontsize-ensurer.reset-size7.size4,.katex .sizing.reset-size7.size4{font-size:.6666666667em}.katex .fontsize-ensurer.reset-size7.size5,.katex .sizing.reset-size7.size5{font-size:.75em}.katex .fontsize-ensurer.reset-size7.size6,.katex .sizing.reset-size7.size6{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size7.size7,.katex .sizing.reset-size7.size7{font-size:1em}.katex .fontsize-ensurer.reset-size7.size8,.katex .sizing.reset-size7.size8{font-size:1.2em}.katex .fontsize-ensurer.reset-size7.size9,.katex .sizing.reset-size7.size9{font-size:1.44em}.katex .fontsize-ensurer.reset-size7.size10,.katex .sizing.reset-size7.size10{font-size:1.7283333333em}.katex .fontsize-ensurer.reset-size7.size11,.katex .sizing.reset-size7.size11{font-size:2.0733333333em}.katex .fontsize-ensurer.reset-size8.size1,.katex .sizing.reset-size8.size1{font-size:.3472222222em}.katex .fontsize-ensurer.reset-size8.size2,.katex .sizing.reset-size8.size2{font-size:.4166666667em}.katex .fontsize-ensurer.reset-size8.size3,.katex .sizing.reset-size8.size3{font-size:.4861111111em}.katex .fontsize-ensurer.reset-size8.size4,.katex .sizing.reset-size8.size4{font-size:.5555555556em}.katex .fontsize-ensurer.reset-size8.size5,.katex .sizing.reset-size8.size5{font-size:.625em}.katex .fontsize-ensurer.reset-size8.size6,.katex .sizing.reset-size8.size6{font-size:.6944444444em}.katex .fontsize-ensurer.reset-size8.size7,.katex .sizing.reset-size8.size7{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size8.size8,.katex .sizing.reset-size8.size8{font-size:1em}.katex .fontsize-ensurer.reset-size8.size9,.katex .sizing.reset-size8.size9{font-size:1.2em}.katex .fontsize-ensurer.reset-size8.size10,.katex .sizing.reset-size8.size10{font-size:1.4402777778em}.katex .fontsize-ensurer.reset-size8.size11,.katex .sizing.reset-size8.size11{font-size:1.7277777778em}.katex .fontsize-ensurer.reset-size9.size1,.katex .sizing.reset-size9.size1{font-size:.2893518519em}.katex .fontsize-ensurer.reset-size9.size2,.katex .sizing.reset-size9.size2{font-size:.3472222222em}.katex .fontsize-ensurer.reset-size9.size3,.katex .sizing.reset-size9.size3{font-size:.4050925926em}.katex .fontsize-ensurer.reset-size9.size4,.katex .sizing.reset-size9.size4{font-size:.462962963em}.katex .fontsize-ensurer.reset-size9.size5,.katex .sizing.reset-size9.size5{font-size:.5208333333em}.katex .fontsize-ensurer.reset-size9.size6,.katex .sizing.reset-size9.size6{font-size:.5787037037em}.katex .fontsize-ensurer.reset-size9.size7,.katex .sizing.reset-size9.size7{font-size:.6944444444em}.katex .fontsize-ensurer.reset-size9.size8,.katex .sizing.reset-size9.size8{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size9.size9,.katex .sizing.reset-size9.size9{font-size:1em}.katex .fontsize-ensurer.reset-size9.size10,.katex .sizing.reset-size9.size10{font-size:1.2002314815em}.katex .fontsize-ensurer.reset-size9.size11,.katex .sizing.reset-size9.size11{font-size:1.4398148148em}.katex .fontsize-ensurer.reset-size10.size1,.katex .sizing.reset-size10.size1{font-size:.2410800386em}.katex .fontsize-ensurer.reset-size10.size2,.katex .sizing.reset-size10.size2{font-size:.2892960463em}.katex .fontsize-ensurer.reset-size10.size3,.katex .sizing.reset-size10.size3{font-size:.337512054em}.katex .fontsize-ensurer.reset-size10.size4,.katex .sizing.reset-size10.size4{font-size:.3857280617em}.katex .fontsize-ensurer.reset-size10.size5,.katex .sizing.reset-size10.size5{font-size:.4339440694em}.katex .fontsize-ensurer.reset-size10.size6,.katex .sizing.reset-size10.size6{font-size:.4821600771em}.katex .fontsize-ensurer.reset-size10.size7,.katex .sizing.reset-size10.size7{font-size:.5785920926em}.katex .fontsize-ensurer.reset-size10.size8,.katex .sizing.reset-size10.size8{font-size:.6943105111em}.katex .fontsize-ensurer.reset-size10.size9,.katex .sizing.reset-size10.size9{font-size:.8331726133em}.katex .fontsize-ensurer.reset-size10.size10,.katex .sizing.reset-size10.size10{font-size:1em}.katex .fontsize-ensurer.reset-size10.size11,.katex .sizing.reset-size10.size11{font-size:1.1996142719em}.katex .fontsize-ensurer.reset-size11.size1,.katex .sizing.reset-size11.size1{font-size:.2009646302em}.katex .fontsize-ensurer.reset-size11.size2,.katex .sizing.reset-size11.size2{font-size:.2411575563em}.katex .fontsize-ensurer.reset-size11.size3,.katex .sizing.reset-size11.size3{font-size:.2813504823em}.katex .fontsize-ensurer.reset-size11.size4,.katex .sizing.reset-size11.size4{font-size:.3215434084em}.katex .fontsize-ensurer.reset-size11.size5,.katex .sizing.reset-size11.size5{font-size:.3617363344em}.katex .fontsize-ensurer.reset-size11.size6,.katex .sizing.reset-size11.size6{font-size:.4019292605em}.katex .fontsize-ensurer.reset-size11.size7,.katex .sizing.reset-size11.size7{font-size:.4823151125em}.katex .fontsize-ensurer.reset-size11.size8,.katex .sizing.reset-size11.size8{font-size:.578778135em}.katex .fontsize-ensurer.reset-size11.size9,.katex .sizing.reset-size11.size9{font-size:.6945337621em}.katex .fontsize-ensurer.reset-size11.size10,.katex .sizing.reset-size11.size10{font-size:.8336012862em}.katex .fontsize-ensurer.reset-size11.size11,.katex .sizing.reset-size11.size11{font-size:1em}.katex .delimsizing.size1{font-family:KaTeX_Size1}.katex .delimsizing.size2{font-family:KaTeX_Size2}.katex .delimsizing.size3{font-family:KaTeX_Size3}.katex .delimsizing.size4{font-family:KaTeX_Size4}.katex .delimsizing.mult .delim-size1>span{font-family:KaTeX_Size1}.katex .delimsizing.mult .delim-size4>span{font-family:KaTeX_Size4}.katex .nulldelimiter{display:inline-block;width:.12em}.katex .delimcenter,.katex .op-symbol{position:relative}.katex .op-symbol.small-op{font-family:KaTeX_Size1}.katex .op-symbol.large-op{font-family:KaTeX_Size2}.katex .accent>.vlist-t,.katex .op-limits>.vlist-t{text-align:center}.katex .accent .accent-body{position:relative}.katex .accent .accent-body:not(.accent-full){width:0}.katex .overlay{display:block}.katex .mtable .vertical-separator{display:inline-block;min-width:1px}.katex .mtable .arraycolsep{display:inline-block}.katex .mtable .col-align-c>.vlist-t{text-align:center}.katex .mtable .col-align-l>.vlist-t{text-align:left}.katex .mtable .col-align-r>.vlist-t{text-align:right}.katex .svg-align{text-align:left}.katex svg{fill:currentColor;stroke:currentColor;display:block;height:inherit;position:absolute;width:100%}.katex svg path{stroke:none}.katex svg{fill-rule:nonzero;fill-opacity:1;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1}.katex img{border-style:none;max-height:none;max-width:none;min-height:0;min-width:0}.katex .stretchy{display:block;overflow:hidden;position:relative;width:100%}.katex .stretchy:after,.katex .stretchy:before{content:""}.katex .hide-tail{overflow:hidden;position:relative;width:100%}.katex .halfarrow-left{left:0;overflow:hidden;position:absolute;width:50.2%}.katex .halfarrow-right{overflow:hidden;position:absolute;right:0;width:50.2%}.katex .brace-left{left:0;overflow:hidden;position:absolute;width:25.1%}.katex .brace-center{left:25%;overflow:hidden;position:absolute;width:50%}.katex .brace-right{overflow:hidden;position:absolute;right:0;width:25.1%}.katex .x-arrow-pad{padding:0 .5em}.katex .cd-arrow-pad{padding:0 .55556em 0 .27778em}.katex .mover,.katex .munder,.katex .x-arrow{text-align:center}.katex .boxpad{padding:0 .3em}.katex .fbox,.katex .fcolorbox{border:.04em solid;box-sizing:border-box}.katex .cancel-pad{padding:0 .2em}.katex .cancel-lap{margin-left:-.2em;margin-right:-.2em}.katex .sout{border-bottom-style:solid;border-bottom-width:.08em}.katex .angl{border-right:.049em solid;border-top:.049em solid;box-sizing:border-box;margin-right:.03889em}.katex .anglpad{padding:0 .03889em}.katex .eqn-num:before{content:"(" counter(katexEqnNo) ")";counter-increment:katexEqnNo}.katex .mml-eqn-num:before{content:"(" counter(mmlEqnNo) ")";counter-increment:mmlEqnNo}.katex .mtr-glue{width:50%}.katex .cd-vert-arrow{display:inline-block;position:relative}.katex .cd-label-left{display:inline-block;position:absolute;right:calc(50% + .3em);text-align:left}.katex .cd-label-right{display:inline-block;left:calc(50% + .3em);position:absolute;text-align:right}.katex-display{display:block;margin:1em 0;text-align:center}.katex-display>.katex{display:block;text-align:center;white-space:nowrap}.katex-display>.katex>.katex-html{display:block;position:relative}.katex-display>.katex>.katex-html>.tag{position:absolute;right:0}.katex-display.leqno>.katex>.katex-html>.tag{left:0;right:auto}.katex-display.fleqn>.katex{padding-left:2em;text-align:left}body{counter-reset:katexEqnNo mmlEqnNo}\n';

    // packages/dsh-plugin/src/client/styles.ts
    var TEACHING_CSS = `
    .ai-teaching-root {
      display: flex; flex-direction: column; height: 100%; min-height: 0;
      font-size: 13px; line-height: 1.6; color: var(--dsw-alias-label-primary, #1f2937);
      background: var(--dsw-alias-bg-base, transparent);
    }
    .ai-teaching-topbar {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 8px 14px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22));
      background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.04));
      flex: 0 0 auto;
    }
    .ai-topbar-title { font-size: 14px; font-weight: 600; margin: 0; }
    .ai-topbar-goal { font-size: 12px; opacity: 0.72; max-width: 380px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; }
    .ai-topbar-meta { font-size: 11px; opacity: 0.62; margin-left: auto; display: flex;
      gap: 10px; align-items: center; flex-wrap: wrap; }
    .ai-lang-switch { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px;
      background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.10)); }
    .ai-lang-switch button { border: none; background: transparent; color: inherit;
      font-size: 11px; padding: 2px 8px; border-radius: 6px; cursor: pointer; }
    .ai-lang-switch button[data-active="true"] {
      background: var(--dsw-alias-state-business-primary, #3b82f6); color: #fff;
    }
    .ai-teaching-body { display: flex; flex: 1 1 auto; min-height: 0; }
    .ai-teaching-sidebar {
      width: 232px; flex: 0 0 232px; overflow-y: auto; padding: 10px 10px 20px;
      border-right: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22));
      background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.03));
    }
    .ai-sidebar-section { margin-bottom: 14px; }
    .ai-sidebar-heading { font-size: 11px; text-transform: none; letter-spacing: 0.02em;
      opacity: 0.6; margin: 0 0 6px; font-weight: 600; }
    .ai-sidebar-heading-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .ai-onboarding-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}

    .ai-course-button {
      display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left;
      border: 1px solid transparent; background: transparent; color: inherit; cursor: pointer;
      border-radius: 8px; padding: 6px 8px; font-size: 12px;
    }
    .ai-course-button:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.10)); }
    .ai-course-button[data-active="true"] {
      border-color: var(--dsw-alias-border-l2, rgba(127,127,127,0.35));
      background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.10));
    }
    .ai-course-title { font-weight: 600; }
    .ai-course-meta { font-size: 11px; opacity: 0.62; }
    .ai-progress { height: 5px; border-radius: 999px; background: var(--dsw-alias-border-l2, rgba(127,127,127,0.22));
      overflow: hidden; margin-top: 4px; }
    .ai-progress > span { display: block; height: 100%; background: var(--dsw-alias-state-business-primary, #3b82f6); }
    .ai-concept-row {
      display: flex; align-items: center; gap: 6px; width: 100%; text-align: left;
      border: none; background: transparent; color: inherit; cursor: pointer;
      border-radius: 6px; padding: 3px 6px; font-size: 12px;
    }
    .ai-concept-row:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08)); }
    .ai-concept-row[data-current="true"] { background: var(--dsw-alias-bg-layer-1, rgba(59,130,246,0.12)); }
    .ai-badge { font-size: 10px; padding: 0 6px; border-radius: 999px; border: 1px solid
      var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); opacity: 0.8; white-space: nowrap; }
    .ai-badge[data-level="mastered"] { color: var(--dsw-alias-state-success-primary, #15803d); border-color: var(--dsw-alias-state-success-primary, #16a34a); opacity: 1; }
    .ai-badge[data-level="checked"] { color: var(--dsw-alias-link, #0369a1); border-color: var(--dsw-alias-link, #0284c7); opacity: 1; }
    .ai-badge[data-level="practiced"] { color: var(--dsw-alias-state-warn-primary, #b45309); border-color: var(--dsw-alias-state-warn-primary, #d97706); opacity: 1; }
    .ai-session-row { display: flex; align-items: center; gap: 6px; width: 100%; text-align: left;
      border: none; background: transparent; color: inherit; cursor: pointer; font-size: 12px;
      padding: 4px 6px; border-radius: 6px; }
    .ai-session-row:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08)); }
    .ai-session-row[data-active="true"] { background: var(--dsw-alias-bg-layer-1, rgba(59,130,246,0.12)); }
    .ai-session-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ai-review-item { font-size: 12px; padding: 6px 8px; border-radius: 8px;
      border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); margin-bottom: 6px; }
    .ai-review-reason { font-size: 11px; opacity: 0.65; }
    .ai-link-button { border: none; background: transparent; color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb));
      cursor: pointer; font-size: 11px; padding: 2px 0; text-align: left; }
    .ai-link-button:hover { text-decoration: underline; }
    .ai-small-button, .ai-primary-button, .ai-danger-button {
      border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35)); background: transparent;
      color: inherit; border-radius: 7px; cursor: pointer; font-size: 12px; padding: 3px 10px;
      font-family: inherit;
    }
    .ai-primary-button { background: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); border-color: transparent; color: #fff; }
    .ai-primary-button:disabled, .ai-small-button:disabled, .ai-danger-button:disabled {
      opacity: 0.45; cursor: not-allowed;
    }
    .ai-danger-button { color: var(--dsw-alias-state-error-primary, #b91c1c); border-color: rgba(185,28,28,0.4); }
    .ai-teaching-main { flex: 1 1 auto; display: flex; min-width: 0; min-height: 0; }
    .ai-chat-panel { flex: 1 1 52%; display: flex; flex-direction: column; min-width: 0;
      border-right: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); }
    .ai-chat-scroll { flex: 1 1 auto; overflow-y: auto; padding: 14px 16px; display: flex;
      flex-direction: column; gap: 10px; }
    .ai-msg { max-width: 92%; border-radius: 12px; padding: 8px 12px; position: relative; }
    .ai-msg-teacher { align-self: flex-start; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.07));
      border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.16)); }
    .ai-msg-student { align-self: flex-end; background: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); color: #fff; }
    .ai-msg-student .teaching-markdown a { color: #dbeafe; }
    .ai-msg-system { align-self: center; font-size: 11px; opacity: 0.65; background: transparent;
      border: 1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); }
    .ai-msg-meta { font-size: 10px; opacity: 0.6; margin-top: 4px; display: flex; gap: 8px;
      flex-wrap: wrap; align-items: center; }
    .ai-msg-student .ai-msg-meta { opacity: 0.85; }
    .ai-evidence-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
    .ai-evidence-chip { font-size: 10px; border-radius: 999px; padding: 1px 8px; cursor: pointer;
      border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35)); background: transparent;
      color: inherit; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ai-evidence-chip[data-kind="course-source"] { border-color: var(--dsw-alias-link, #0284c7); color: var(--dsw-alias-link, #0369a1); }
    .ai-evidence-chip[data-kind="external-web"] { border-color: var(--dsw-alias-state-warn-primary, #d97706); color: var(--dsw-alias-state-warn-primary, #b45309); }
    .ai-evidence-chip[data-kind="model-knowledge"] { border-style: dashed; }
    .ai-evidence-detail { font-size: 11px; opacity: 0.8; margin-top: 4px; padding: 6px 8px;
      border-left: 2px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35));
      background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.05)); white-space: pre-wrap; }
    .ai-quick-actions { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 16px 6px; }
    .ai-quick-actions button { font-size: 11px; }
    .ai-progress-line { font-size: 11px; opacity: 0.75; padding: 2px 16px 0;
      display: flex; gap: 8px; align-items: center; }
    .ai-streaming-text { white-space: pre-wrap; }
    .ai-composer { display: flex; gap: 8px; padding: 8px 12px 12px; align-items: flex-end;
      border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.18)); }
    .ai-composer textarea {
      flex: 1; resize: vertical; min-height: 44px; max-height: 180px; padding: 8px 10px;
      border-radius: 10px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3));
      background: var(--dsw-alias-bg-base, transparent); color: inherit; font: inherit; font-size: 13px;
      box-sizing: border-box;
    }
    .ai-teaching-area { flex: 1 1 48%; display: flex; flex-direction: column; min-width: 0;
      min-height: 0; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.02)); }
    .ai-tabs { display: flex; gap: 2px; padding: 6px 10px 0; border-bottom: 1px solid
      var(--dsw-alias-border-l2, rgba(127,127,127,0.2)); flex: 0 0 auto; }
    .ai-tab { border: none; background: transparent; color: inherit; cursor: pointer;
      font-size: 12px; padding: 6px 10px; border-bottom: 2px solid transparent; opacity: 0.7; }
    .ai-tab[data-active="true"] { border-bottom-color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); opacity: 1;
      font-weight: 600; }
    .ai-tab-body { flex: 1 1 auto; overflow-y: auto; padding: 12px 14px 24px; min-height: 0; }
    .ai-empty { opacity: 0.62; font-size: 12px; padding: 10px 0; }
    .ai-activity-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .ai-activity-list button[data-active="true"] { border-color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb));
      color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); }
    .ai-source-card { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); border-radius: 8px;
      padding: 8px 10px; margin-bottom: 8px; }
    .ai-source-title { font-weight: 600; font-size: 12px; display: flex; gap: 8px; align-items: center; }
    .ai-source-meta { font-size: 11px; opacity: 0.65; }
    .ai-source-unit { font-size: 12px; padding: 6px 0; border-bottom: 1px solid
      var(--dsw-alias-border-l2, rgba(127,127,127,0.12)); white-space: pre-wrap; }
    .ai-source-issue { font-size: 11px; color: var(--dsw-alias-state-warn-primary, #b45309); }
    .ai-env-row { font-size: 12px; padding: 6px 0; border-bottom: 1px solid
      var(--dsw-alias-border-l2, rgba(127,127,127,0.12)); }
    .ai-course-setup { flex: 1 1 auto; overflow-y: auto; padding: 24px; min-height: 0; }
    .ai-course-setup-card { max-width: 820px; margin: 0 auto; padding: 18px 20px;
      border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25)); border-radius: 14px;
      background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.05)); }
    .ai-draft-review h3 { color: inherit; }
    .ai-draft-review .ai-checklist { max-height: 320px; overflow-y: auto; }
    .ai-onboarding { padding: 24px; max-width: 720px; margin: 0 auto; overflow-y: auto; }
    .ai-onboarding h2 { font-size: 18px; margin: 0 0 6px; }
    .ai-onboarding p { opacity: 0.8; margin: 4px 0 10px; }
    .ai-onboarding-card { border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25)); border-radius: 12px;
      padding: 14px 16px; margin-bottom: 14px; background: var(--dsw-alias-bg-base, transparent); }
    .ai-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .ai-field label { font-size: 12px; font-weight: 600; }
    .ai-field input, .ai-field textarea, .ai-field select {
      padding: 7px 9px; border-radius: 8px; border: 1px solid
      var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); background: var(--dsw-alias-bg-base, transparent);
      color: inherit; font: inherit; font-size: 13px;
    }
    .ai-field-hint { font-size: 11px; opacity: 0.62; }
    .ai-banner { display: flex; gap: 8px; align-items: flex-start; padding: 7px 12px; font-size: 12px;
      border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.2)); }
    .ai-banner[data-kind="error"] { background: rgba(220,38,38,0.08); color: var(--dsw-alias-state-error-primary, #b91c1c); }
    .ai-banner[data-kind="warning"] { background: rgba(217,119,6,0.1); color: var(--dsw-alias-state-warn-primary, #b45309); }
    .ai-banner[data-kind="info"] { background: rgba(37,99,235,0.07); color: #1d4ed8; }
    .ai-banner-close { margin-left: auto; border: none; background: transparent; cursor: pointer;
      color: inherit; font-size: 14px; line-height: 1; }
    .ai-task { display: flex; gap: 10px; align-items: center; padding: 6px 14px; font-size: 12px;
      border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.16)); }
    .ai-task-progress { flex: 1; height: 5px; border-radius: 999px; overflow: hidden;
      background: var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); }
    .ai-task-progress > span { display: block; height: 100%; background: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); }
    .ai-spinner { width: 12px; height: 12px; border-radius: 50%; display: inline-block;
      border: 2px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35));
      border-top-color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); animation: ai-spin 0.8s linear infinite; }
    @keyframes ai-spin { to { transform: rotate(360deg); } }
    .ai-checklist { font-size: 12px; margin: 4px 0 0; padding-left: 18px; }
    .ai-warning-list { font-size: 11px; color: var(--dsw-alias-state-warn-primary, #b45309); margin: 6px 0 0; padding-left: 18px; }
    .teaching-markdown { font-size: 13px; line-height: 1.68; overflow-wrap: anywhere; }
    .teaching-markdown h1, .teaching-markdown h2, .teaching-markdown h3, .teaching-markdown h4 {
      margin: 0.6em 0 0.3em; line-height: 1.35; }
    .teaching-markdown h1 { font-size: 16px; } .teaching-markdown h2 { font-size: 15px; }
    .teaching-markdown h3 { font-size: 14px; } .teaching-markdown h4 { font-size: 13px; }
    .teaching-markdown p { margin: 0.4em 0; }
    .teaching-markdown ul, .teaching-markdown ol { margin: 0.35em 0; padding-left: 1.5em; }
    .teaching-markdown li { margin: 0.15em 0; }
    .teaching-markdown code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.92em; background: var(--dsw-alias-markdown-inline-code, rgba(127,127,127,0.14));
      padding: 0.1em 0.35em; border-radius: 4px; }
    .teaching-markdown pre { background: var(--dsw-alias-markdown-code-block, rgba(127,127,127,0.1));
      padding: 8px 10px; border-radius: 8px; overflow-x: auto; margin: 0.5em 0; }
    .teaching-markdown pre code { background: transparent; padding: 0; }
    .teaching-markdown blockquote { margin: 0.5em 0; padding-left: 10px;
      border-left: 3px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35)); opacity: 0.9; }
    .teaching-markdown a { color: var(--dsw-alias-state-business-primary, var(--dsw-alias-state-business-primary, #2563eb)); }
    .teaching-markdown hr { border: none; border-top: 1px solid
      var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); margin: 0.8em 0; }
    .teaching-math-inline, .teaching-math-block { color: inherit; }
    .teaching-math-block { display: block; overflow-x: auto; margin: 0.5em 0; }
    .teaching-activity { margin-bottom: 10px; }
    .teaching-activity-title { color: inherit; }
    .ai-notes-area textarea { width: 100%; min-height: 160px; box-sizing: border-box;
      padding: 8px 10px; border-radius: 8px; border: 1px solid
      var(--dsw-alias-border-l2, rgba(127,127,127,0.3)); background: var(--dsw-alias-bg-base, transparent);
      color: inherit; font: inherit; font-size: 12px; line-height: 1.6; }
    .ai-muted { opacity: 0.62; font-size: 12px; }
    .ai-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .ai-grow { flex: 1; }
    @media (max-width: 980px) {
      .ai-teaching-body { flex-direction: column; }
      .ai-teaching-sidebar { width: auto; flex: 0 0 auto; max-height: 180px;
        border-right: none; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.22)); }
      .ai-teaching-main { flex-direction: column; }
      .ai-chat-panel { flex: 1 1 auto; border-right: none; min-height: 320px; }
      .ai-teaching-area { flex: 1 1 auto; }
    }
    .ai-course-row{display:flex;align-items:stretch;gap:4px}
    .ai-course-row .ai-course-button{flex:1;min-width:0}
    .ai-course-delete{border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:transparent;color:var(--dsw-alias-label-secondary,#888);border-radius:6px;cursor:pointer;padding:0 6px;font-size:12px}
    .ai-course-delete:hover{color:#c0392b;border-color:#c0392b}
    .ai-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:60}
    .ai-modal{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111);border-radius:12px;padding:18px 20px;max-width:460px;width:calc(100vw - 48px);box-shadow:0 20px 60px rgba(0,0,0,.3)}
    .ai-modal h3{margin:0 0 8px;font-size:15px}
    .ai-modal .ai-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
    `;

    // packages/dsh-plugin/src/client/components/Workspace.tsx
    var import_react10 = __toESM(require("react"), 1);

    // packages/dsh-plugin/src/client/api.ts
    var API_PREFIX = "/api/teaching";
    var ApiFailure = class extends Error {
      appError;
      constructor(appError) {
        super(`${appError.code}: ${appError.message}`);
        this.name = "ApiFailure";
        this.appError = appError;
      }
    };
    function buildQueryString(query) {
      if (query === void 0) return "";
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === void 0 || value === null || value === "") continue;
        if (Array.isArray(value)) {
          for (const entry of value) params.append(key, String(entry));
        } else {
          params.append(key, String(value));
        }
      }
      const text2 = params.toString();
      return text2 === "" ? "" : `?${text2}`;
    }
    function apiUrl(operation, query) {
      return `${API_PREFIX}/${operation}${buildQueryString(query)}`;
    }
    var REQUEST_DEFAULTS = {
      credentials: "same-origin",
      headers: { accept: "application/json" }
    };
    function toApiFailure(cause, fallbackMessage = "\u8BF7\u6C42\u5931\u8D25") {
      if (cause instanceof ApiFailure) return cause;
      const message = cause instanceof Error ? cause.message : String(cause);
      return new ApiFailure({ code: "network", message: fallbackMessage, details: { message }, retryable: true });
    }
    async function readResultEnvelope(response) {
      let body;
      const text2 = await response.text();
      try {
        body = text2 === "" ? void 0 : JSON.parse(text2);
      } catch {
        throw new ApiFailure({
          code: "failed",
          message: `Host \u8FD4\u56DE\u4E86\u975E JSON \u54CD\u5E94\uFF08HTTP ${response.status}\uFF09`,
          details: { preview: text2.slice(0, 300) }
        });
      }
      const envelope = body;
      if (envelope !== void 0 && envelope !== null && typeof envelope === "object" && "ok" in envelope) {
        if (envelope.ok) return envelope.value;
        throw new ApiFailure(envelope.error);
      }
      throw new ApiFailure({
        code: "failed",
        message: `Host \u54CD\u5E94\u7F3A\u5C11 Result \u5C01\u5957\uFF08HTTP ${response.status}\uFF09`,
        details: { preview: text2.slice(0, 300) }
      });
    }
    async function apiGet(operation, query) {
      let response;
      try {
        response = await fetch(apiUrl(operation, query), {
          ...REQUEST_DEFAULTS,
          method: "GET"
        });
      } catch (cause) {
        throw toApiFailure(cause, `\u65E0\u6CD5\u8FDE\u63A5 Host\uFF08${operation}\uFF09`);
      }
      return await readResultEnvelope(response);
    }
    async function apiPost(operation, body) {
      let response;
      try {
        response = await fetch(apiUrl(operation), {
          ...REQUEST_DEFAULTS,
          method: "POST",
          headers: { ...REQUEST_DEFAULTS.headers, "content-type": "application/json" },
          body: JSON.stringify(body)
        });
      } catch (cause) {
        throw toApiFailure(cause, `\u65E0\u6CD5\u8FDE\u63A5 Host\uFF08${operation}\uFF09`);
      }
      return await readResultEnvelope(response);
    }
    async function apiChatSend(sessionId, text2, signal) {
      let response;
      try {
        response = await fetch(apiUrl("chat.send"), {
          ...REQUEST_DEFAULTS,
          method: "POST",
          headers: { ...REQUEST_DEFAULTS.headers, "content-type": "application/json", accept: "text/event-stream" },
          body: JSON.stringify({ sessionId, text: text2 }),
          ...signal !== void 0 ? { signal } : {}
        });
      } catch (cause) {
        if (signal?.aborted === true) {
          throw new ApiFailure({ code: "cancelled", message: "\u5DF2\u505C\u6B62\u751F\u6210" });
        }
        throw toApiFailure(cause, "\u65E0\u6CD5\u8FDE\u63A5 Host\uFF08chat.send\uFF09");
      }
      return response;
    }
    function describeError(error) {
      if (error instanceof ApiFailure) return error.appError.message;
      return error instanceof Error ? error.message : String(error);
    }
    function toAppError(error) {
      if (error instanceof ApiFailure) return error.appError;
      return { code: "failed", message: error instanceof Error ? error.message : String(error) };
    }
    function isNetworkError(error) {
      return error instanceof ApiFailure && error.appError.code === "network";
    }
    function splitSseFrames(buffer) {
      const normalised = buffer.replace(/\r\n/gu, "\n");
      const parts = normalised.split("\n\n");
      const rest = parts.pop() ?? "";
      return { frames: parts, rest };
    }
    function decodeSseFrame(frame) {
      const dataLines = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).replace(/^ /u, ""));
      }
      if (dataLines.length === 0) return [];
      const payload = dataLines.join("\n");
      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch {
        throw new ApiFailure({ code: "failed", message: "SSE \u4E8B\u4EF6\u4E0D\u662F\u5408\u6CD5 JSON", details: { payload: payload.slice(0, 300) } });
      }
      if (!isChatStreamEvent(parsed)) {
        throw new ApiFailure({ code: "failed", message: "SSE \u4E8B\u4EF6\u7C7B\u578B\u65E0\u6548", details: { payload: payload.slice(0, 300) } });
      }
      return [parsed];
    }
    function isChatStreamEvent(value) {
      if (typeof value !== "object" || value === null) return false;
      const type = value.type;
      if (typeof type !== "string") return false;
      switch (type) {
        case "start":
          return typeof value.studentMessage === "object";
        case "progress":
          return typeof value.label === "string";
        case "delta":
          return typeof value.text === "string";
        case "activity":
          return typeof value.activity === "object";
        case "evidence":
          return Array.isArray(value.refs);
        case "position":
          return typeof value.stage === "string";
        case "done":
          return typeof value.message === "object";
        case "error":
          return typeof value.error === "object";
        default:
          return false;
      }
    }
    function isTerminalChatEvent(event) {
      return event.type === "done" || event.type === "error";
    }
    async function consumeChatStreamResponse(response, sink) {
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        try {
          await readResultEnvelope(response);
        } catch (error) {
          const failure = toApiFailure(error, "Chat \u8BF7\u6C42\u5931\u8D25");
          sink.onEvent({ type: "error", error: failure.appError });
          return { events: 1, terminal: true };
        }
        sink.onEvent({ type: "error", error: { code: "failed", message: "Chat \u54CD\u5E94\u65E2\u4E0D\u662F\u4E8B\u4EF6\u6D41\u4E5F\u4E0D\u662F\u9519\u8BEF\u5C01\u5957" } });
        return { events: 1, terminal: true };
      }
      if (response.body === null) {
        const failure = new ApiFailure({ code: "failed", message: "Chat \u54CD\u5E94\u6CA1\u6709\u53EF\u8BFB\u6570\u636E\u6D41" });
        sink.onEvent({ type: "error", error: failure.appError });
        return { events: 1, terminal: true };
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let events = 0;
      let terminal = false;
      try {
        while (!terminal) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { frames, rest } = splitSseFrames(buffer);
          buffer = rest;
          for (const frame of frames) {
            let decoded;
            try {
              decoded = decodeSseFrame(frame);
            } catch (error) {
              const failure = toApiFailure(error, "SSE \u89E3\u6790\u5931\u8D25");
              sink.onProtocolError?.(failure);
              terminal = true;
              break;
            }
            for (const event of decoded) {
              events += 1;
              sink.onEvent(event);
              if (isTerminalChatEvent(event)) {
                terminal = true;
                break;
              }
            }
            if (terminal) break;
          }
        }
        if (!terminal && buffer.trim() !== "") {
          for (const event of decodeSseFrame(buffer)) {
            events += 1;
            sink.onEvent(event);
            if (isTerminalChatEvent(event)) terminal = true;
          }
        }
        if (!terminal) {
          sink.onEvent({
            type: "error",
            error: { code: "failed", message: "\u8FDE\u63A5\u4E2D\u65AD\uFF1AHost \u672A\u53D1\u9001\u5B8C\u6210\u4E8B\u4EF6\uFF0C\u672C\u8F6E\u56DE\u7B54\u53EF\u80FD\u4E0D\u5B8C\u6574\u3002", retryable: true }
          });
          events += 1;
          terminal = true;
        }
      } catch (error) {
        const failure = toApiFailure(error, "\u8BFB\u53D6\u4E8B\u4EF6\u6D41\u5931\u8D25");
        sink.onEvent({ type: "error", error: failure.appError });
        events += 1;
        terminal = true;
      } finally {
        try {
          await reader.cancel();
        } catch {
        }
        reader.releaseLock();
      }
      return { events, terminal };
    }

    // packages/dsh-plugin/src/client/state.ts
    var INITIAL_WORKSPACE_STATE = {
      phase: "loading",
      courses: [],
      sessions: [],
      messages: [],
      activities: [],
      activityStates: {},
      mastery: [],
      review: [],
      chat: { status: "idle", text: "", evidence: [] },
      tasks: [],
      selectedTab: "activity"
    };
    function upsertActivity(activities, activity) {
      const index = activities.findIndex((existing) => existing.id === activity.id);
      if (index < 0) return [...activities, activity];
      const next = [...activities];
      next[index] = activity;
      return next;
    }
    function appendMessage(messages, message) {
      if (messages.some((existing) => existing.id === message.id)) return messages;
      return [...messages, message];
    }
    function mergeEvidence(existing, incoming) {
      const seen = new Set(existing.map((ref) => JSON.stringify(ref)));
      const merged = [...existing];
      for (const ref of incoming) {
        const key = JSON.stringify(ref);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(ref);
      }
      return merged;
    }
    function latestActivity(activities) {
      let latest;
      for (const activity of activities) {
        if (latest === void 0 || activity.updatedAt > latest.updatedAt) latest = activity;
      }
      return latest;
    }
    function applyChatStreamEvent(state, event) {
      const chat = state.chat;
      switch (event.type) {
        case "start":
          return {
            ...state,
            messages: appendMessage(state.messages, event.studentMessage),
            chat: { status: "streaming", text: "", evidence: [], studentMessageId: event.studentMessage.id },
            phase: "ready"
          };
        case "progress":
          return { ...state, chat: { ...chat, progressLabel: event.label } };
        case "delta":
          return { ...state, chat: { ...chat, text: chat.text + event.text } };
        case "activity":
          return {
            ...state,
            activities: upsertActivity(state.activities, event.activity),
            session: state.session === void 0 ? state.session : {
              ...state.session,
              activities: upsertActivity(state.session.activities, event.activity)
            },
            selectedActivityId: event.activity.id,
            selectedTab: "activity",
            chat: { ...chat }
          };
        case "evidence":
          return {
            ...state,
            chat: { ...chat, evidence: mergeEvidence(chat.evidence, event.refs) }
          };
        case "position": {
          if (state.session === void 0) return state;
          return {
            ...state,
            session: {
              ...state.session,
              session: {
                ...state.session.session,
                position: {
                  ...state.session.session.position,
                  stage: event.stage,
                  ...event.conceptId !== void 0 ? { conceptId: event.conceptId } : {},
                  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
                }
              }
            }
          };
        }
        case "done":
          return {
            ...state,
            messages: appendMessage(state.messages, event.message),
            session: state.session === void 0 ? state.session : {
              ...state.session,
              messages: appendMessage(state.session.messages, event.message)
            },
            chat: { status: "idle", text: "", evidence: [] }
          };
        case "error":
          return {
            ...state,
            chat: { ...chat, status: "idle", error: event.error }
          };
        default:
          return state;
      }
    }
    function workspaceReducer(state, action) {
      switch (action.type) {
        case "bootstrap/loaded": {
          const empty = action.courses.length === 0;
          return {
            ...state,
            phase: empty ? "onboarding" : "ready",
            bootstrap: action.bootstrap,
            courses: action.courses,
            fatalError: void 0
          };
        }
        case "bootstrap/failed":
          return { ...state, phase: "fatal", fatalError: action.error };
        case "wizard/open":
          if (state.phase === "loading") return state;
          return {
            ...state,
            phase: "onboarding",
            courseDraft: void 0,
            notice: void 0,
            busy: void 0,
            chat: { status: "idle", text: "", evidence: [] }
          };
        case "wizard/close":
          if (state.phase !== "onboarding") return state;
          return { ...state, phase: "ready", busy: void 0 };
        case "workspace/loading":
          return { ...state, phase: "loading", fatalError: void 0 };
        case "courses/loaded":
          return {
            ...state,
            courses: action.courses,
            phase: action.courses.length === 0 && state.bootstrap !== void 0 ? "onboarding" : state.phase
          };
        case "course/loaded": {
          return {
            ...state,
            courseDetail: action.detail,
            sessions: action.sessions,
            phase: "ready"
          };
        }
        case "course/cleared":
          return {
            ...state,
            courseDetail: void 0,
            session: void 0,
            sessions: [],
            messages: [],
            activities: [],
            activityStates: {},
            mastery: [],
            review: [],
            selectedActivityId: void 0,
            selectedSourceDocumentId: void 0,
            chat: { status: "idle", text: "", evidence: [] }
          };
        case "sessions/loaded":
          return { ...state, sessions: action.sessions };
        case "session/loaded": {
          const activityStates = {};
          for (const activityState of action.session.states) activityStates[activityState.activityId] = activityState;
          const positionActivityId = action.session.session.position.activityId;
          const selected = action.session.activities.some((activity) => activity.id === positionActivityId) ? positionActivityId : latestActivity(action.session.activities)?.id;
          return {
            ...state,
            phase: "ready",
            session: action.session,
            messages: [...action.session.messages],
            activities: [...action.session.activities],
            activityStates,
            mastery: [...action.session.mastery],
            review: [...action.session.review],
            selectedActivityId: selected,
            selectedTab: selected === void 0 ? state.selectedTab : "activity",
            chat: { status: "idle", text: "", evidence: [] },
            notice: void 0
          };
        }
        case "session/cleared":
          return {
            ...state,
            session: void 0,
            messages: [],
            activities: [],
            activityStates: {},
            mastery: [],
            review: [],
            selectedActivityId: void 0,
            chat: { status: "idle", text: "", evidence: [] }
          };
        case "activity/upserted":
          return {
            ...state,
            activities: upsertActivity(state.activities, action.activity),
            selectedActivityId: action.activity.id
          };
        case "activity/state":
          return {
            ...state,
            activityStates: { ...state.activityStates, [action.state.activityId]: action.state }
          };
        case "activity/states": {
          const next = { ...state.activityStates };
          for (const activityState of action.states) next[activityState.activityId] = activityState;
          return { ...state, activityStates: next };
        }
        case "learning/updated":
          return {
            ...state,
            ...action.mastery !== void 0 ? { mastery: action.mastery } : {},
            ...action.review !== void 0 ? { review: action.review } : {}
          };
        case "chat/stream-event":
          return applyChatStreamEvent(state, action.event);
        case "chat/cancel-requested":
          return {
            ...state,
            chat: { ...state.chat, status: "stopping" }
          };
        case "chat/local-error":
          return {
            ...state,
            chat: { ...state.chat, status: "idle", error: action.error }
          };
        case "chat/reset":
          return { ...state, chat: { status: "idle", text: "", evidence: [] } };
        case "tasks/loaded":
          return { ...state, tasks: action.tasks };
        case "environments/loaded":
          return { ...state, environments: action.environments };
        case "draft/loaded":
          return { ...state, ...action.draft !== void 0 ? { courseDraft: action.draft } : {} };
        case "ui/tab":
          return { ...state, selectedTab: action.tab };
        case "ui/select-activity":
          return { ...state, selectedActivityId: action.activityId, selectedTab: "activity" };
        case "ui/select-source":
          return { ...state, selectedSourceDocumentId: action.documentId, selectedTab: "sources" };
        case "notice":
          return { ...state, notice: action.notice };
        case "busy":
          return { ...state, busy: action.label };
        case "error/clear":
          return { ...state, chat: { ...state.chat, error: void 0 } };
        default:
          return state;
      }
    }
    function computeCourseProgress(state) {
      const revision = state.courseDetail?.activeRevision ?? state.courseDetail?.draftRevision;
      const total = revision?.concepts.length ?? 0;
      const coveredIds = new Set(state.session?.session.coveredConceptIds ?? []);
      const masteryIds = new Set((state.mastery ?? []).filter((record) => record.level !== "unseen").map((record) => record.conceptId));
      const covered = revision === void 0 ? 0 : revision.concepts.filter((concept) => coveredIds.has(concept.id) || masteryIds.has(concept.id)).length;
      return { covered, total, percent: total === 0 ? 0 : Math.round(covered / total * 100) };
    }
    function needsCourseSetup(detail) {
      if (detail === void 0) return false;
      if (detail.activeRevision !== void 0) return false;
      return detail.course.draftRevisionId !== void 0 || detail.draftRevision !== void 0;
    }
    function draftConceptCount(detail) {
      return detail?.draftRevision?.concepts.length ?? detail?.draft?.revision.concepts.length ?? 0;
    }
    function sortedReview(review) {
      return [...review].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    }
    function isChatBusy(state) {
      return state.chat.status === "streaming" || state.chat.status === "stopping";
    }
    function selectedActivity(state) {
      return state.activities.find((activity) => activity.id === state.selectedActivityId);
    }

    // packages/dsh-plugin/src/client/components/Banner.tsx
    var import_react = require("react");

    // packages/dsh-plugin/src/client/helpers.ts
    var STAGE_LABELS = {
      "goal-setting": "\u8BBE\u5B9A\u76EE\u6807",
      diagnosis: "\u8BCA\u65AD\u57FA\u7840",
      teaching: "\u8BB2\u89E3",
      practice: "\u7EC3\u4E60",
      transfer: "\u8FC1\u79FB\u68C0\u9A8C",
      review: "\u590D\u4E60",
      idle: "\u7A7A\u95F2"
    };
    var MASTERY_LABELS = {
      unseen: "\u672A\u63A5\u89E6",
      exposed: "\u5DF2\u63A5\u89E6",
      practiced: "\u7EC3\u4E60\u8FC7",
      checked: "\u5DF2\u68C0\u9A8C",
      mastered: "\u5DF2\u638C\u63E1"
    };
    var REVIEW_REASON_LABELS = {
      "low-mastery": "\u638C\u63E1\u504F\u5F31",
      spaced: "\u95F4\u9694\u590D\u4E60",
      "upcoming-course-need": "\u540E\u7EED\u8BFE\u7A0B\u9700\u8981",
      "after-dispute": "\u4E89\u8BAE\u540E\u590D\u68C0"
    };
    var EVIDENCE_KIND_LABELS = {
      "course-source": "\u8BFE\u7A0B\u8D44\u6599",
      "other-course": "\u5176\u4ED6\u8BFE\u7A0B",
      "external-web": "\u5916\u90E8\u7F51\u9875",
      "model-knowledge": "\u6A21\u578B\u8865\u5145",
      derivation: "\u63A8\u5BFC",
      experiment: "\u5B9E\u9A8C\u8F93\u51FA"
    };
    var TASK_STATUS_LABELS = {
      queued: "\u7B49\u5F85\u4E2D",
      running: "\u8FDB\u884C\u4E2D",
      completed: "\u5DF2\u5B8C\u6210",
      partial: "\u90E8\u5206\u5B8C\u6210",
      failed: "\u5931\u8D25",
      cancelled: "\u5DF2\u53D6\u6D88"
    };
    function formatTime(iso) {
      if (iso === void 0) return "";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "";
      return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
    function formatDay(iso) {
      if (iso === void 0) return "";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "";
      const today = /* @__PURE__ */ new Date();
      const sameDay = date.toDateString() === today.toDateString();
      if (sameDay) return "\u4ECA\u5929";
      const yesterday = new Date(today.getTime() - 864e5);
      if (date.toDateString() === yesterday.toDateString()) return "\u6628\u5929";
      return `${date.getMonth() + 1} \u6708 ${date.getDate()} \u65E5`;
    }
    var LANGUAGE_LABELS = { zh: "\u4E2D\u6587", en: "English", bilingual: "\u4E2D\u82F1\u53CC\u8BED" };
    function formatPercent(value) {
      if (value === void 0 || !Number.isFinite(value)) return "";
      return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
    }
    function truncate(text2, max) {
      return text2.length <= max ? text2 : `${text2.slice(0, max - 1)}\u2026`;
    }

    // packages/dsh-plugin/src/client/components/Banner.tsx
    var import_jsx_runtime = require("react/jsx-runtime");
    function Banner(props) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ai-banner", "data-kind": props.kind, role: props.kind === "error" ? "alert" : "status", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          props.message,
          props.details !== void 0 ? `\uFF08${props.details}\uFF09` : ""
        ] }),
        props.actions,
        props.onDismiss !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ai-banner-close", "aria-label": "\u5173\u95ED\u63D0\u793A", onClick: props.onDismiss, children: "\xD7" })
      ] });
    }
    function ErrorBanner(props) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Banner,
        {
          kind: props.error.code === "network" ? "warning" : "error",
          message: props.error.message,
          details: props.error.code,
          ...props.onDismiss !== void 0 ? { onDismiss: props.onDismiss } : {},
          actions: props.onRetry !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ai-small-button", onClick: props.onRetry, children: "\u91CD\u8BD5" }) : void 0
        }
      );
    }
    function Spinner({ label }) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ai-row", role: "status", "aria-label": label ?? "\u52A0\u8F7D\u4E2D", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ai-spinner" }),
        label !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ai-muted", children: label })
      ] });
    }
    function TaskRow(props) {
      const { snapshot } = props;
      const running = snapshot.status === "running" || snapshot.status === "queued";
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ai-task", role: "status", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: snapshot.label }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ai-muted", children: [
          TASK_STATUS_LABELS[snapshot.status],
          formatPercent(snapshot.progress) !== "" ? ` ${formatPercent(snapshot.progress)}` : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ai-task-progress", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: `${Math.round((snapshot.progress ?? 0) * 100)}%` } }) }),
        running && props.onCancel !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ai-small-button", onClick: () => props.onCancel?.(snapshot.id), children: "\u53D6\u6D88" }),
        snapshot.status === "partial" && snapshot.warnings !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ai-muted", children: [
          snapshot.warnings.length,
          " \u4E2A\u8B66\u544A"
        ] })
      ] });
    }
    function TaskProgressBar(props) {
      const visible = props.tasks.filter((task) => task.status === "queued" || task.status === "running" || task.status === "failed" || task.status === "partial");
      if (visible.length === 0) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: visible.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, { snapshot: task, ...props.onCancel !== void 0 ? { onCancel: props.onCancel } : {} }, task.id)) });
    }

    // packages/dsh-plugin/src/client/components/ChatPanel.tsx
    var import_react3 = __toESM(require("react"), 1);

    // packages/dsh-plugin/src/client/components/Markdown.tsx
    var import_react2 = require("react");

    // packages/teaching-core/src/contracts/result.ts
    function ok(value) {
      return { ok: true, value };
    }
    function err(code, message, extra = {}) {
      return { ok: false, error: { code, message, ...extra } };
    }

    // packages/teaching-core/src/render/dom.ts
    function resolveDocument(environment) {
      if (environment?.document !== void 0) return environment.document;
      const globalDocument = globalThis.document;
      if (globalDocument !== void 0) return globalDocument;
      throw new Error("\u6E32\u67D3\u5668\u9700\u8981 Document\uFF1B\u6D4F\u89C8\u5668\u5185\u4F7F\u7528\u5168\u5C40 document\uFF0C\u6D4B\u8BD5/\u79BB\u7EBF\u751F\u6210\u65F6\u901A\u8FC7 options.document \u6CE8\u5165\u3002");
    }
    function createElement(document2, tag, options = {}) {
      const element = document2.createElement(tag);
      if (options.className !== void 0) element.className = options.className;
      if (options.title !== void 0) element.setAttribute("title", options.title);
      if (options.ariaLabel !== void 0) element.setAttribute("aria-label", options.ariaLabel);
      if (options.styles !== void 0) applyStyles(element, options.styles);
      if (options.attrs !== void 0) {
        for (const [name2, value] of Object.entries(options.attrs)) element.setAttribute(name2, value);
      }
      if (options.text !== void 0) element.textContent = options.text;
      return element;
    }
    function createSvgElement(document2, tag, attrs = {}) {
      const element = document2.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [name2, value] of Object.entries(attrs)) element.setAttribute(name2, String(value));
      return element;
    }
    function applyStyles(element, styles2) {
      for (const [name2, value] of Object.entries(styles2)) {
        ;
        element.style[name2] = value;
      }
    }
    function clearElement(element) {
      while (element.firstChild !== null) element.removeChild(element.firstChild);
    }
    function on(target, type, listener, options) {
      target.addEventListener(type, listener, options);
      return () => {
        target.removeEventListener(type, listener, options);
      };
    }
    function formatNumber(value, digits = 4) {
      if (!Number.isFinite(value)) return "\u2014";
      if (Number.isInteger(value)) return String(value);
      const rounded = Number(value.toFixed(digits));
      return String(rounded);
    }
    var PLOT_COLORS = {
      blue: "#3b82f6",
      orange: "#f59e0b",
      green: "#22c55e",
      purple: "#a855f7",
      red: "#ef4444",
      gray: "#94a3b8"
    };
    function plotColor(token, index) {
      const fallback = ["blue", "orange", "green", "purple", "red", "gray"][index % 6] ?? "blue";
      return PLOT_COLORS[token ?? fallback] ?? PLOT_COLORS.blue ?? "#3b82f6";
    }

    // node_modules/.pnpm/katex@0.16.47/node_modules/katex/dist/katex.mjs
    var ParseError = class _ParseError extends Error {
      // The underlying error message without any context added.
      constructor(message, token) {
        var error = "KaTeX parse error: " + message;
        var start;
        var end;
        var loc = token && token.loc;
        if (loc && loc.start <= loc.end) {
          var input = loc.lexer.input;
          start = loc.start;
          end = loc.end;
          if (start === input.length) {
            error += " at end of input: ";
          } else {
            error += " at position " + (start + 1) + ": ";
          }
          var underlined = input.slice(start, end).replace(/[^]/g, "$&\u0332");
          var left;
          if (start > 15) {
            left = "\u2026" + input.slice(start - 15, start);
          } else {
            left = input.slice(0, start);
          }
          var right;
          if (end + 15 < input.length) {
            right = input.slice(end, end + 15) + "\u2026";
          } else {
            right = input.slice(end);
          }
          error += left + underlined + right;
        }
        super(error);
        this.name = "ParseError";
        this.position = void 0;
        this.length = void 0;
        this.rawMessage = void 0;
        Object.setPrototypeOf(this, _ParseError.prototype);
        this.position = start;
        if (start != null && end != null) {
          this.length = end - start;
        }
        this.rawMessage = message;
      }
    };
    var uppercase = /([A-Z])/g;
    var hyphenate = (str) => str.replace(uppercase, "-$1").toLowerCase();
    var ESCAPE_LOOKUP = {
      "&": "&amp;",
      ">": "&gt;",
      "<": "&lt;",
      '"': "&quot;",
      "'": "&#x27;"
    };
    var ESCAPE_REGEX = /[&><"']/g;
    var escape = (text2) => String(text2).replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
    var getBaseElem = (group) => {
      if (group.type === "ordgroup") {
        if (group.body.length === 1) {
          return getBaseElem(group.body[0]);
        } else {
          return group;
        }
      } else if (group.type === "color") {
        if (group.body.length === 1) {
          return getBaseElem(group.body[0]);
        } else {
          return group;
        }
      } else if (group.type === "font") {
        return getBaseElem(group.body);
      } else {
        return group;
      }
    };
    var characterNodesTypes = /* @__PURE__ */ new Set(["mathord", "textord", "atom"]);
    var isCharacterBox = (group) => characterNodesTypes.has(getBaseElem(group).type);
    var protocolFromUrl = (url) => {
      var protocol = /^[\x00-\x20]*([^\\/#?]*?)(:|&#0*58|&#x0*3a|&colon)/i.exec(url);
      if (!protocol) {
        return "_relative";
      }
      if (protocol[2] !== ":") {
        return null;
      }
      if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(protocol[1])) {
        return null;
      }
      return protocol[1].toLowerCase();
    };
    var SETTINGS_SCHEMA = {
      displayMode: {
        type: "boolean",
        description: "Render math in display mode, which puts the math in display style (so \\int and \\sum are large, for example), and centers the math on the page on its own line.",
        cli: "-d, --display-mode"
      },
      output: {
        type: {
          enum: ["htmlAndMathml", "html", "mathml"]
        },
        description: "Determines the markup language of the output.",
        cli: "-F, --format <type>"
      },
      leqno: {
        type: "boolean",
        description: "Render display math in leqno style (left-justified tags)."
      },
      fleqn: {
        type: "boolean",
        description: "Render display math flush left."
      },
      throwOnError: {
        type: "boolean",
        default: true,
        cli: "-t, --no-throw-on-error",
        cliDescription: "Render errors (in the color given by --error-color) instead of throwing a ParseError exception when encountering an error."
      },
      errorColor: {
        type: "string",
        default: "#cc0000",
        cli: "-c, --error-color <color>",
        cliDescription: "A color string given in the format 'rgb' or 'rrggbb' (no #). This option determines the color of errors rendered by the -t option.",
        cliProcessor: (color) => "#" + color
      },
      macros: {
        type: "object",
        cli: "-m, --macro <def>",
        cliDescription: "Define custom macro of the form '\\foo:expansion' (use multiple -m arguments for multiple macros).",
        cliDefault: [],
        cliProcessor: (def, defs) => {
          defs.push(def);
          return defs;
        }
      },
      minRuleThickness: {
        type: "number",
        description: "Specifies a minimum thickness, in ems, for fraction lines, `\\sqrt` top lines, `{array}` vertical lines, `\\hline`, `\\hdashline`, `\\underline`, `\\overline`, and the borders of `\\fbox`, `\\boxed`, and `\\fcolorbox`.",
        processor: (t) => Math.max(0, t),
        cli: "--min-rule-thickness <size>",
        cliProcessor: parseFloat
      },
      colorIsTextColor: {
        type: "boolean",
        description: "Makes \\color behave like LaTeX's 2-argument \\textcolor, instead of LaTeX's one-argument \\color mode change.",
        cli: "-b, --color-is-text-color"
      },
      strict: {
        type: [{
          enum: ["warn", "ignore", "error"]
        }, "boolean", "function"],
        description: "Turn on strict / LaTeX faithfulness mode, which throws an error if the input uses features that are not supported by LaTeX.",
        cli: "-S, --strict",
        cliDefault: false
      },
      trust: {
        type: ["boolean", "function"],
        description: "Trust the input, enabling all HTML features such as \\url.",
        cli: "-T, --trust"
      },
      maxSize: {
        type: "number",
        default: Infinity,
        description: "If non-zero, all user-specified sizes, e.g. in \\rule{500em}{500em}, will be capped to maxSize ems. Otherwise, elements and spaces can be arbitrarily large",
        processor: (s) => Math.max(0, s),
        cli: "-s, --max-size <n>",
        cliProcessor: parseInt
      },
      maxExpand: {
        type: "number",
        default: 1e3,
        description: "Limit the number of macro expansions to the specified number, to prevent e.g. infinite macro loops. If set to Infinity, the macro expander will try to fully expand as in LaTeX.",
        processor: (n) => Math.max(0, n),
        cli: "-e, --max-expand <n>",
        cliProcessor: (n) => n === "Infinity" ? Infinity : parseInt(n)
      },
      globalGroup: {
        type: "boolean",
        cli: false
      }
    };
    function getImplicitDefault(type) {
      if (typeof type !== "string") {
        return type.enum[0];
      }
      switch (type) {
        case "boolean":
          return false;
        case "string":
          return "";
        case "number":
          return 0;
        case "object":
          return {};
        default:
          throw new Error("Unexpected schema type; settings must declare an explicit default.");
      }
    }
    function getDefaultValue(schema) {
      if (schema.default !== void 0) {
        return schema.default;
      }
      var type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
      return getImplicitDefault(type);
    }
    function applySetting(target, prop, options, schema) {
      var optionValue = options[prop];
      target[prop] = optionValue !== void 0 ? schema.processor ? schema.processor(optionValue) : optionValue : getDefaultValue(schema);
    }
    var Settings = class {
      constructor(options) {
        if (options === void 0) {
          options = {};
        }
        this.displayMode = void 0;
        this.output = void 0;
        this.leqno = void 0;
        this.fleqn = void 0;
        this.throwOnError = void 0;
        this.errorColor = void 0;
        this.macros = void 0;
        this.minRuleThickness = void 0;
        this.colorIsTextColor = void 0;
        this.strict = void 0;
        this.trust = void 0;
        this.maxSize = void 0;
        this.maxExpand = void 0;
        this.globalGroup = void 0;
        options = options || {};
        for (var prop of Object.keys(SETTINGS_SCHEMA)) {
          var schema = SETTINGS_SCHEMA[prop];
          if (schema) {
            applySetting(this, prop, options, schema);
          }
        }
      }
      /**
       * Report nonstrict (non-LaTeX-compatible) input.
       * Can safely not be called if `this.strict` is false in JavaScript.
       */
      reportNonstrict(errorCode, errorMsg, token) {
        var strict = this.strict;
        if (typeof strict === "function") {
          strict = strict(errorCode, errorMsg, token);
        }
        if (!strict || strict === "ignore") {
          return;
        } else if (strict === true || strict === "error") {
          throw new ParseError("LaTeX-incompatible input and strict mode is set to 'error': " + (errorMsg + " [" + errorCode + "]"), token);
        } else if (strict === "warn") {
          typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to 'warn': " + (errorMsg + " [" + errorCode + "]"));
        } else {
          typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to " + ("unrecognized '" + strict + "': " + errorMsg + " [" + errorCode + "]"));
        }
      }
      /**
       * Check whether to apply strict (LaTeX-adhering) behavior for unusual
       * input (like `\\`).  Unlike `nonstrict`, will not throw an error;
       * instead, "error" translates to a return value of `true`, while "ignore"
       * translates to a return value of `false`.  May still print a warning:
       * "warn" prints a warning and returns `false`.
       * This is for the second category of `errorCode`s listed in the README.
       */
      useStrictBehavior(errorCode, errorMsg, token) {
        var strict = this.strict;
        if (typeof strict === "function") {
          try {
            strict = strict(errorCode, errorMsg, token);
          } catch (error) {
            strict = "error";
          }
        }
        if (!strict || strict === "ignore") {
          return false;
        } else if (strict === true || strict === "error") {
          return true;
        } else if (strict === "warn") {
          typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to 'warn': " + (errorMsg + " [" + errorCode + "]"));
          return false;
        } else {
          typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to " + ("unrecognized '" + strict + "': " + errorMsg + " [" + errorCode + "]"));
          return false;
        }
      }
      /**
       * Check whether to test potentially dangerous input, and return
       * `true` (trusted) or `false` (untrusted).  The sole argument `context`
       * should be an object with `command` field specifying the relevant LaTeX
       * command (as a string starting with `\`), and any other arguments, etc.
       * If `context` has a `url` field, a `protocol` field will automatically
       * get added by this function (changing the specified object).
       */
      isTrusted(context) {
        if ("url" in context && context.url && !context.protocol) {
          var protocol = protocolFromUrl(context.url);
          if (protocol == null) {
            return false;
          }
          context.protocol = protocol;
        }
        var trust = typeof this.trust === "function" ? this.trust(context) : this.trust;
        return Boolean(trust);
      }
    };
    var Style = class {
      constructor(id, size, cramped) {
        this.id = void 0;
        this.size = void 0;
        this.cramped = void 0;
        this.id = id;
        this.size = size;
        this.cramped = cramped;
      }
      /**
       * Get the style of a superscript given a base in the current style.
       */
      sup() {
        return styles[sup[this.id]];
      }
      /**
       * Get the style of a subscript given a base in the current style.
       */
      sub() {
        return styles[sub[this.id]];
      }
      /**
       * Get the style of a fraction numerator given the fraction in the current
       * style.
       */
      fracNum() {
        return styles[fracNum[this.id]];
      }
      /**
       * Get the style of a fraction denominator given the fraction in the current
       * style.
       */
      fracDen() {
        return styles[fracDen[this.id]];
      }
      /**
       * Get the cramped version of a style (in particular, cramping a cramped style
       * doesn't change the style).
       */
      cramp() {
        return styles[cramp[this.id]];
      }
      /**
       * Get a text or display version of this style.
       */
      text() {
        return styles[text$1[this.id]];
      }
      /**
       * Return true if this style is tightly spaced (scriptstyle/scriptscriptstyle)
       */
      isTight() {
        return this.size >= 2;
      }
    };
    var D = 0;
    var Dc = 1;
    var T = 2;
    var Tc = 3;
    var S = 4;
    var Sc = 5;
    var SS = 6;
    var SSc = 7;
    var styles = [new Style(D, 0, false), new Style(Dc, 0, true), new Style(T, 1, false), new Style(Tc, 1, true), new Style(S, 2, false), new Style(Sc, 2, true), new Style(SS, 3, false), new Style(SSc, 3, true)];
    var sup = [S, Sc, S, Sc, SS, SSc, SS, SSc];
    var sub = [Sc, Sc, Sc, Sc, SSc, SSc, SSc, SSc];
    var fracNum = [T, Tc, S, Sc, SS, SSc, SS, SSc];
    var fracDen = [Tc, Tc, Sc, Sc, SSc, SSc, SSc, SSc];
    var cramp = [Dc, Dc, Tc, Tc, Sc, Sc, SSc, SSc];
    var text$1 = [D, Dc, T, Tc, T, Tc, T, Tc];
    var Style$1 = {
      DISPLAY: styles[D],
      TEXT: styles[T],
      SCRIPT: styles[S],
      SCRIPTSCRIPT: styles[SS]
    };
    var scriptData = [{
      // Latin characters beyond the Latin-1 characters we have metrics for.
      // Needed for Czech, Hungarian and Turkish text, for example.
      name: "latin",
      blocks: [
        [256, 591],
        // Latin Extended-A and Latin Extended-B
        [768, 879]
        // Combining Diacritical marks
      ]
    }, {
      // The Cyrillic script used by Russian and related languages.
      // A Cyrillic subset used to be supported as explicitly defined
      // symbols in symbols.js
      name: "cyrillic",
      blocks: [[1024, 1279]]
    }, {
      // Armenian
      name: "armenian",
      blocks: [[1328, 1423]]
    }, {
      // The Brahmic scripts of South and Southeast Asia
      // Devanagari (0900–097F)
      // Bengali (0980–09FF)
      // Gurmukhi (0A00–0A7F)
      // Gujarati (0A80–0AFF)
      // Oriya (0B00–0B7F)
      // Tamil (0B80–0BFF)
      // Telugu (0C00–0C7F)
      // Kannada (0C80–0CFF)
      // Malayalam (0D00–0D7F)
      // Sinhala (0D80–0DFF)
      // Thai (0E00–0E7F)
      // Lao (0E80–0EFF)
      // Tibetan (0F00–0FFF)
      // Myanmar (1000–109F)
      name: "brahmic",
      blocks: [[2304, 4255]]
    }, {
      name: "georgian",
      blocks: [[4256, 4351]]
    }, {
      // Chinese and Japanese.
      // The "k" in cjk is for Korean, but we've separated Korean out
      name: "cjk",
      blocks: [
        [12288, 12543],
        // CJK symbols and punctuation, Hiragana, Katakana
        [19968, 40879],
        // CJK ideograms
        [65280, 65376]
        // Fullwidth punctuation
        // TODO: add halfwidth Katakana and Romanji glyphs
      ]
    }, {
      // Korean
      name: "hangul",
      blocks: [[44032, 55215]]
    }];
    function scriptFromCodepoint(codepoint) {
      for (var i = 0; i < scriptData.length; i++) {
        var script2 = scriptData[i];
        for (var _i = 0; _i < script2.blocks.length; _i++) {
          var block = script2.blocks[_i];
          if (codepoint >= block[0] && codepoint <= block[1]) {
            return script2.name;
          }
        }
      }
      return null;
    }
    var allBlocks = [];
    scriptData.forEach((s) => s.blocks.forEach((b) => allBlocks.push(...b)));
    function supportedCodepoint(codepoint) {
      for (var i = 0; i < allBlocks.length; i += 2) {
        if (codepoint >= allBlocks[i] && codepoint <= allBlocks[i + 1]) {
          return true;
        }
      }
      return false;
    }
    var doubleBrushStroke = (svgPath) => svgPath + " " + svgPath;
    var hLinePad = 80;
    var sqrtMain = function sqrtMain2(extraVinculum, hLinePad2) {
      return "M95," + (622 + extraVinculum + hLinePad2) + "\nc-2.7,0,-7.17,-2.7,-13.5,-8c-5.8,-5.3,-9.5,-10,-9.5,-14\nc0,-2,0.3,-3.3,1,-4c1.3,-2.7,23.83,-20.7,67.5,-54\nc44.2,-33.3,65.8,-50.3,66.5,-51c1.3,-1.3,3,-2,5,-2c4.7,0,8.7,3.3,12,10\ns173,378,173,378c0.7,0,35.3,-71,104,-213c68.7,-142,137.5,-285,206.5,-429\nc69,-144,104.5,-217.7,106.5,-221\nl" + extraVinculum / 2.075 + " -" + extraVinculum + "\nc5.3,-9.3,12,-14,20,-14\nH400000v" + (40 + extraVinculum) + "H845.2724\ns-225.272,467,-225.272,467s-235,486,-235,486c-2.7,4.7,-9,7,-19,7\nc-6,0,-10,-1,-12,-3s-194,-422,-194,-422s-65,47,-65,47z\nM" + (834 + extraVinculum) + " " + hLinePad2 + "h400000v" + (40 + extraVinculum) + "h-400000z";
    };
    var sqrtSize1 = function sqrtSize12(extraVinculum, hLinePad2) {
      return "M263," + (601 + extraVinculum + hLinePad2) + "c0.7,0,18,39.7,52,119\nc34,79.3,68.167,158.7,102.5,238c34.3,79.3,51.8,119.3,52.5,120\nc340,-704.7,510.7,-1060.3,512,-1067\nl" + extraVinculum / 2.084 + " -" + extraVinculum + "\nc4.7,-7.3,11,-11,19,-11\nH40000v" + (40 + extraVinculum) + "H1012.3\ns-271.3,567,-271.3,567c-38.7,80.7,-84,175,-136,283c-52,108,-89.167,185.3,-111.5,232\nc-22.3,46.7,-33.8,70.3,-34.5,71c-4.7,4.7,-12.3,7,-23,7s-12,-1,-12,-1\ns-109,-253,-109,-253c-72.7,-168,-109.3,-252,-110,-252c-10.7,8,-22,16.7,-34,26\nc-22,17.3,-33.3,26,-34,26s-26,-26,-26,-26s76,-59,76,-59s76,-60,76,-60z\nM" + (1001 + extraVinculum) + " " + hLinePad2 + "h400000v" + (40 + extraVinculum) + "h-400000z";
    };
    var sqrtSize2 = function sqrtSize22(extraVinculum, hLinePad2) {
      return "M983 " + (10 + extraVinculum + hLinePad2) + "\nl" + extraVinculum / 3.13 + " -" + extraVinculum + "\nc4,-6.7,10,-10,18,-10 H400000v" + (40 + extraVinculum) + "\nH1013.1s-83.4,268,-264.1,840c-180.7,572,-277,876.3,-289,913c-4.7,4.7,-12.7,7,-24,7\ns-12,0,-12,0c-1.3,-3.3,-3.7,-11.7,-7,-25c-35.3,-125.3,-106.7,-373.3,-214,-744\nc-10,12,-21,25,-33,39s-32,39,-32,39c-6,-5.3,-15,-14,-27,-26s25,-30,25,-30\nc26.7,-32.7,52,-63,76,-91s52,-60,52,-60s208,722,208,722\nc56,-175.3,126.3,-397.3,211,-666c84.7,-268.7,153.8,-488.2,207.5,-658.5\nc53.7,-170.3,84.5,-266.8,92.5,-289.5z\nM" + (1001 + extraVinculum) + " " + hLinePad2 + "h400000v" + (40 + extraVinculum) + "h-400000z";
    };
    var sqrtSize3 = function sqrtSize32(extraVinculum, hLinePad2) {
      return "M424," + (2398 + extraVinculum + hLinePad2) + "\nc-1.3,-0.7,-38.5,-172,-111.5,-514c-73,-342,-109.8,-513.3,-110.5,-514\nc0,-2,-10.7,14.3,-32,49c-4.7,7.3,-9.8,15.7,-15.5,25c-5.7,9.3,-9.8,16,-12.5,20\ns-5,7,-5,7c-4,-3.3,-8.3,-7.7,-13,-13s-13,-13,-13,-13s76,-122,76,-122s77,-121,77,-121\ns209,968,209,968c0,-2,84.7,-361.7,254,-1079c169.3,-717.3,254.7,-1077.7,256,-1081\nl" + extraVinculum / 4.223 + " -" + extraVinculum + "c4,-6.7,10,-10,18,-10 H400000\nv" + (40 + extraVinculum) + "H1014.6\ns-87.3,378.7,-272.6,1166c-185.3,787.3,-279.3,1182.3,-282,1185\nc-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2z M" + (1001 + extraVinculum) + " " + hLinePad2 + "\nh400000v" + (40 + extraVinculum) + "h-400000z";
    };
    var sqrtSize4 = function sqrtSize42(extraVinculum, hLinePad2) {
      return "M473," + (2713 + extraVinculum + hLinePad2) + "\nc339.3,-1799.3,509.3,-2700,510,-2702 l" + extraVinculum / 5.298 + " -" + extraVinculum + "\nc3.3,-7.3,9.3,-11,18,-11 H400000v" + (40 + extraVinculum) + "H1017.7\ns-90.5,478,-276.2,1466c-185.7,988,-279.5,1483,-281.5,1485c-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2c0,-1.3,-5.3,-32,-16,-92c-50.7,-293.3,-119.7,-693.3,-207,-1200\nc0,-1.3,-5.3,8.7,-16,30c-10.7,21.3,-21.3,42.7,-32,64s-16,33,-16,33s-26,-26,-26,-26\ns76,-153,76,-153s77,-151,77,-151c0.7,0.7,35.7,202,105,604c67.3,400.7,102,602.7,104,\n606zM" + (1001 + extraVinculum) + " " + hLinePad2 + "h400000v" + (40 + extraVinculum) + "H1017.7z";
    };
    var phasePath = function phasePath2(y) {
      var x = y / 2;
      return "M400000 " + y + " H0 L" + x + " 0 l65 45 L145 " + (y - 80) + " H400000z";
    };
    var sqrtTall = function sqrtTall2(extraVinculum, hLinePad2, viewBoxHeight) {
      var vertSegment = viewBoxHeight - 54 - hLinePad2 - extraVinculum;
      return "M702 " + (extraVinculum + hLinePad2) + "H400000" + (40 + extraVinculum) + "\nH742v" + vertSegment + "l-4 4-4 4c-.667.7 -2 1.5-4 2.5s-4.167 1.833-6.5 2.5-5.5 1-9.5 1\nh-12l-28-84c-16.667-52-96.667 -294.333-240-727l-212 -643 -85 170\nc-4-3.333-8.333-7.667-13 -13l-13-13l77-155 77-156c66 199.333 139 419.667\n219 661 l218 661zM702 " + hLinePad2 + "H400000v" + (40 + extraVinculum) + "H742z";
    };
    var sqrtPath = function sqrtPath2(size, extraVinculum, viewBoxHeight) {
      extraVinculum = 1e3 * extraVinculum;
      var path2 = "";
      switch (size) {
        case "sqrtMain":
          path2 = sqrtMain(extraVinculum, hLinePad);
          break;
        case "sqrtSize1":
          path2 = sqrtSize1(extraVinculum, hLinePad);
          break;
        case "sqrtSize2":
          path2 = sqrtSize2(extraVinculum, hLinePad);
          break;
        case "sqrtSize3":
          path2 = sqrtSize3(extraVinculum, hLinePad);
          break;
        case "sqrtSize4":
          path2 = sqrtSize4(extraVinculum, hLinePad);
          break;
        case "sqrtTall":
          path2 = sqrtTall(extraVinculum, hLinePad, viewBoxHeight);
      }
      return path2;
    };
    var innerPath = function innerPath2(name2, height) {
      switch (name2) {
        case "\u239C":
          return doubleBrushStroke("M291 0 H417 V" + height + " H291z");
        case "\u2223":
          return doubleBrushStroke("M145 0 H188 V" + height + " H145z");
        case "\u2225":
          return doubleBrushStroke("M145 0 H188 V" + height + " H145z") + doubleBrushStroke("M367 0 H410 V" + height + " H367z");
        case "\u239F":
          return doubleBrushStroke("M457 0 H583 V" + height + " H457z");
        case "\u23A2":
          return doubleBrushStroke("M319 0 H403 V" + height + " H319z");
        case "\u23A5":
          return doubleBrushStroke("M263 0 H347 V" + height + " H263z");
        case "\u23AA":
          return doubleBrushStroke("M384 0 H504 V" + height + " H384z");
        case "\u23D0":
          return doubleBrushStroke("M312 0 H355 V" + height + " H312z");
        case "\u2016":
          return doubleBrushStroke("M257 0 H300 V" + height + " H257z") + doubleBrushStroke("M478 0 H521 V" + height + " H478z");
        default:
          return "";
      }
    };
    var path = {
      // The doubleleftarrow geometry is from glyph U+21D0 in the font KaTeX Main
      doubleleftarrow: "M262 157\nl10-10c34-36 62.7-77 86-123 3.3-8 5-13.3 5-16 0-5.3-6.7-8-20-8-7.3\n 0-12.2.5-14.5 1.5-2.3 1-4.8 4.5-7.5 10.5-49.3 97.3-121.7 169.3-217 216-28\n 14-57.3 25-88 33-6.7 2-11 3.8-13 5.5-2 1.7-3 4.2-3 7.5s1 5.8 3 7.5\nc2 1.7 6.3 3.5 13 5.5 68 17.3 128.2 47.8 180.5 91.5 52.3 43.7 93.8 96.2 124.5\n 157.5 9.3 8 15.3 12.3 18 13h6c12-.7 18-4 18-10 0-2-1.7-7-5-15-23.3-46-52-87\n-86-123l-10-10h399738v-40H218c328 0 0 0 0 0l-10-8c-26.7-20-65.7-43-117-69 2.7\n-2 6-3.7 10-5 36.7-16 72.3-37.3 107-64l10-8h399782v-40z\nm8 0v40h399730v-40zm0 194v40h399730v-40z",
      // doublerightarrow is from glyph U+21D2 in font KaTeX Main
      doublerightarrow: "M399738 392l\n-10 10c-34 36-62.7 77-86 123-3.3 8-5 13.3-5 16 0 5.3 6.7 8 20 8 7.3 0 12.2-.5\n 14.5-1.5 2.3-1 4.8-4.5 7.5-10.5 49.3-97.3 121.7-169.3 217-216 28-14 57.3-25 88\n-33 6.7-2 11-3.8 13-5.5 2-1.7 3-4.2 3-7.5s-1-5.8-3-7.5c-2-1.7-6.3-3.5-13-5.5-68\n-17.3-128.2-47.8-180.5-91.5-52.3-43.7-93.8-96.2-124.5-157.5-9.3-8-15.3-12.3-18\n-13h-6c-12 .7-18 4-18 10 0 2 1.7 7 5 15 23.3 46 52 87 86 123l10 10H0v40h399782\nc-328 0 0 0 0 0l10 8c26.7 20 65.7 43 117 69-2.7 2-6 3.7-10 5-36.7 16-72.3 37.3\n-107 64l-10 8H0v40zM0 157v40h399730v-40zm0 194v40h399730v-40z",
      // leftarrow is from glyph U+2190 in font KaTeX Main
      leftarrow: "M400000 241H110l3-3c68.7-52.7 113.7-120\n 135-202 4-14.7 6-23 6-25 0-7.3-7-11-21-11-8 0-13.2.8-15.5 2.5-2.3 1.7-4.2 5.8\n-5.5 12.5-1.3 4.7-2.7 10.3-4 17-12 48.7-34.8 92-68.5 130S65.3 228.3 18 247\nc-10 4-16 7.7-18 11 0 8.7 6 14.3 18 17 47.3 18.7 87.8 47 121.5 85S196 441.3 208\n 490c.7 2 1.3 5 2 9s1.2 6.7 1.5 8c.3 1.3 1 3.3 2 6s2.2 4.5 3.5 5.5c1.3 1 3.3\n 1.8 6 2.5s6 1 10 1c14 0 21-3.7 21-11 0-2-2-10.3-6-25-20-79.3-65-146.7-135-202\n l-3-3h399890zM100 241v40h399900v-40z",
      // overbrace is from glyphs U+23A9/23A8/23A7 in font KaTeX_Size4-Regular
      leftbrace: "M6 548l-6-6v-35l6-11c56-104 135.3-181.3 238-232 57.3-28.7 117\n-45 179-50h399577v120H403c-43.3 7-81 15-113 26-100.7 33-179.7 91-237 174-2.7\n 5-6 9-10 13-.7 1-7.3 1-20 1H6z",
      leftbraceunder: "M0 6l6-6h17c12.688 0 19.313.3 20 1 4 4 7.313 8.3 10 13\n 35.313 51.3 80.813 93.8 136.5 127.5 55.688 33.7 117.188 55.8 184.5 66.5.688\n 0 2 .3 4 1 18.688 2.7 76 4.3 172 5h399450v120H429l-6-1c-124.688-8-235-61.7\n-331-161C60.687 138.7 32.312 99.3 7 54L0 41V6z",
      // overgroup is from the MnSymbol package (public domain)
      leftgroup: "M400000 80\nH435C64 80 168.3 229.4 21 260c-5.9 1.2-18 0-18 0-2 0-3-1-3-3v-38C76 61 257 0\n 435 0h399565z",
      leftgroupunder: "M400000 262\nH435C64 262 168.3 112.6 21 82c-5.9-1.2-18 0-18 0-2 0-3 1-3 3v38c76 158 257 219\n 435 219h399565z",
      // Harpoons are from glyph U+21BD in font KaTeX Main
      leftharpoon: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3\n-3.3 10.2-9.5 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5\n-18.3 3-21-1.3-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7\n-196 228-6.7 4.7-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40z",
      leftharpoonplus: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3-3.3 10.2-9.5\n 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5-18.3 3-21-1.3\n-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7-196 228-6.7 4.7\n-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40zM0 435v40h400000v-40z\nm0 0v40h400000v-40z",
      leftharpoondown: "M7 241c-4 4-6.333 8.667-7 14 0 5.333.667 9 2 11s5.333\n 5.333 12 10c90.667 54 156 130 196 228 3.333 10.667 6.333 16.333 9 17 2 .667 5\n 1 9 1h5c10.667 0 16.667-2 18-6 2-2.667 1-9.667-3-21-32-87.333-82.667-157.667\n-152-211l-3-3h399907v-40zM93 281 H400000 v-40L7 241z",
      leftharpoondownplus: "M7 435c-4 4-6.3 8.7-7 14 0 5.3.7 9 2 11s5.3 5.3 12\n 10c90.7 54 156 130 196 228 3.3 10.7 6.3 16.3 9 17 2 .7 5 1 9 1h5c10.7 0 16.7\n-2 18-6 2-2.7 1-9.7-3-21-32-87.3-82.7-157.7-152-211l-3-3h399907v-40H7zm93 0\nv40h399900v-40zM0 241v40h399900v-40zm0 0v40h399900v-40z",
      // hook is from glyph U+21A9 in font KaTeX Main
      lefthook: "M400000 281 H103s-33-11.2-61-33.5S0 197.3 0 164s14.2-61.2 42.5\n-83.5C70.8 58.2 104 47 142 47 c16.7 0 25 6.7 25 20 0 12-8.7 18.7-26 20-40 3.3\n-68.7 15.7-86 37-10 12-15 25.3-15 40 0 22.7 9.8 40.7 29.5 54 19.7 13.3 43.5 21\n 71.5 23h399859zM103 281v-40h399897v40z",
      leftlinesegment: doubleBrushStroke("M40 281 V428 H0 V94 H40 V241 H400000 v40z"),
      leftbracketunder: doubleBrushStroke("M0 0 h120 V290 H399995 v120 H0z"),
      leftbracketover: doubleBrushStroke("M0 440 h120 V150 H399995 v-120 H0z"),
      leftmapsto: doubleBrushStroke("M40 281 V448H0V74H40V241H400000v40z"),
      // tofrom is from glyph U+21C4 in font KaTeX AMS Regular
      leftToFrom: "M0 147h400000v40H0zm0 214c68 40 115.7 95.7 143 167h22c15.3 0 23\n-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69-70-101l-7-8h399905v-40H95l7-8\nc28.7-32 52-65.7 70-101 10.7-23.3 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 265.3\n 68 321 0 361zm0-174v-40h399900v40zm100 154v40h399900v-40z",
      longequal: doubleBrushStroke("M0 50 h400000 v40H0z m0 194h40000v40H0z"),
      midbrace: "M200428 334\nc-100.7-8.3-195.3-44-280-108-55.3-42-101.7-93-139-153l-9-14c-2.7 4-5.7 8.7-9 14\n-53.3 86.7-123.7 153-211 199-66.7 36-137.3 56.3-212 62H0V214h199568c178.3-11.7\n 311.7-78.3 403-201 6-8 9.7-12 11-12 .7-.7 6.7-1 18-1s17.3.3 18 1c1.3 0 5 4 11\n 12 44.7 59.3 101.3 106.3 170 141s145.3 54.3 229 60h199572v120z",
      midbraceunder: "M199572 214\nc100.7 8.3 195.3 44 280 108 55.3 42 101.7 93 139 153l9 14c2.7-4 5.7-8.7 9-14\n 53.3-86.7 123.7-153 211-199 66.7-36 137.3-56.3 212-62h199568v120H200432c-178.3\n 11.7-311.7 78.3-403 201-6 8-9.7 12-11 12-.7.7-6.7 1-18 1s-17.3-.3-18-1c-1.3 0\n-5-4-11-12-44.7-59.3-101.3-106.3-170-141s-145.3-54.3-229-60H0V214z",
      oiintSize1: "M512.6 71.6c272.6 0 320.3 106.8 320.3 178.2 0 70.8-47.7 177.6\n-320.3 177.6S193.1 320.6 193.1 249.8c0-71.4 46.9-178.2 319.5-178.2z\nm368.1 178.2c0-86.4-60.9-215.4-368.1-215.4-306.4 0-367.3 129-367.3 215.4 0 85.8\n60.9 214.8 367.3 214.8 307.2 0 368.1-129 368.1-214.8z",
      oiintSize2: "M757.8 100.1c384.7 0 451.1 137.6 451.1 230 0 91.3-66.4 228.8\n-451.1 228.8-386.3 0-452.7-137.5-452.7-228.8 0-92.4 66.4-230 452.7-230z\nm502.4 230c0-111.2-82.4-277.2-502.4-277.2s-504 166-504 277.2\nc0 110 84 276 504 276s502.4-166 502.4-276z",
      oiiintSize1: "M681.4 71.6c408.9 0 480.5 106.8 480.5 178.2 0 70.8-71.6 177.6\n-480.5 177.6S202.1 320.6 202.1 249.8c0-71.4 70.5-178.2 479.3-178.2z\nm525.8 178.2c0-86.4-86.8-215.4-525.7-215.4-437.9 0-524.7 129-524.7 215.4 0\n85.8 86.8 214.8 524.7 214.8 438.9 0 525.7-129 525.7-214.8z",
      oiiintSize2: "M1021.2 53c603.6 0 707.8 165.8 707.8 277.2 0 110-104.2 275.8\n-707.8 275.8-606 0-710.2-165.8-710.2-275.8C311 218.8 415.2 53 1021.2 53z\nm770.4 277.1c0-131.2-126.4-327.6-770.5-327.6S248.4 198.9 248.4 330.1\nc0 130 128.8 326.4 772.7 326.4s770.5-196.4 770.5-326.4z",
      rightarrow: "M0 241v40h399891c-47.3 35.3-84 78-110 128\n-16.7 32-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20\n 11 8 0 13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7\n 39-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85\n-40.5-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n 151.7 139 205zm0 0v40h399900v-40z",
      rightbrace: "M400000 542l\n-6 6h-17c-12.7 0-19.3-.3-20-1-4-4-7.3-8.3-10-13-35.3-51.3-80.8-93.8-136.5-127.5\ns-117.2-55.8-184.5-66.5c-.7 0-2-.3-4-1-18.7-2.7-76-4.3-172-5H0V214h399571l6 1\nc124.7 8 235 61.7 331 161 31.3 33.3 59.7 72.7 85 118l7 13v35z",
      rightbraceunder: "M399994 0l6 6v35l-6 11c-56 104-135.3 181.3-238 232-57.3\n 28.7-117 45-179 50H-300V214h399897c43.3-7 81-15 113-26 100.7-33 179.7-91 237\n-174 2.7-5 6-9 10-13 .7-1 7.3-1 20-1h17z",
      rightgroup: "M0 80h399565c371 0 266.7 149.4 414 180 5.9 1.2 18 0 18 0 2 0\n 3-1 3-3v-38c-76-158-257-219-435-219H0z",
      rightgroupunder: "M0 262h399565c371 0 266.7-149.4 414-180 5.9-1.2 18 0 18\n 0 2 0 3 1 3 3v38c-76 158-257 219-435 219H0z",
      rightharpoon: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3\n-3.7-15.3-11-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2\n-10.7 0-16.7 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58\n 69.2 92 94.5zm0 0v40h399900v-40z",
      rightharpoonplus: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3-3.7-15.3-11\n-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2-10.7 0-16.7\n 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58 69.2 92 94.5z\nm0 0v40h399900v-40z m100 194v40h399900v-40zm0 0v40h399900v-40z",
      rightharpoondown: "M399747 511c0 7.3 6.7 11 20 11 8 0 13-.8 15-2.5s4.7-6.8\n 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3 8.5-5.8 9.5\n-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3-64.7 57-92 95\n-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 241v40h399900v-40z",
      rightharpoondownplus: "M399747 705c0 7.3 6.7 11 20 11 8 0 13-.8\n 15-2.5s4.7-6.8 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3\n 8.5-5.8 9.5-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3\n-64.7 57-92 95-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 435v40h399900v-40z\nm0-194v40h400000v-40zm0 0v40h400000v-40z",
      righthook: "M399859 241c-764 0 0 0 0 0 40-3.3 68.7-15.7 86-37 10-12 15-25.3\n 15-40 0-22.7-9.8-40.7-29.5-54-19.7-13.3-43.5-21-71.5-23-17.3-1.3-26-8-26-20 0\n-13.3 8.7-20 26-20 38 0 71 11.2 99 33.5 0 0 7 5.6 21 16.7 14 11.2 21 33.5 21\n 66.8s-14 61.2-42 83.5c-28 22.3-61 33.5-99 33.5L0 241z M0 281v-40h399859v40z",
      rightlinesegment: doubleBrushStroke("M399960 241 V94 h40 V428 h-40 V281 H0 v-40z"),
      rightbracketunder: doubleBrushStroke("M399995 0 h-120 V290 H0 v120 H400000z"),
      rightbracketover: doubleBrushStroke("M399995 440 h-120 V150 H0 v-120 H399995z"),
      rightToFrom: "M400000 167c-70.7-42-118-97.7-142-167h-23c-15.3 0-23 .3-23\n 1 0 1.3 5.3 13.7 16 37 18 35.3 41.3 69 70 101l7 8H0v40h399905l-7 8c-28.7 32\n-52 65.7-70 101-10.7 23.3-16 35.7-16 37 0 .7 7.7 1 23 1h23c24-69.3 71.3-125 142\n-167z M100 147v40h399900v-40zM0 341v40h399900v-40z",
      // twoheadleftarrow is from glyph U+219E in font KaTeX AMS Regular
      twoheadleftarrow: "M0 167c68 40\n 115.7 95.7 143 167h22c15.3 0 23-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69\n-70-101l-7-8h125l9 7c50.7 39.3 85 86 103 140h46c0-4.7-6.3-18.7-19-42-18-35.3\n-40-67.3-66-96l-9-9h399716v-40H284l9-9c26-28.7 48-60.7 66-96 12.7-23.333 19\n-37.333 19-42h-46c-18 54-52.3 100.7-103 140l-9 7H95l7-8c28.7-32 52-65.7 70-101\n 10.7-23.333 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 71.3 68 127 0 167z",
      twoheadrightarrow: "M400000 167\nc-68-40-115.7-95.7-143-167h-22c-15.3 0-23 .3-23 1 0 1.3 5.3 13.7 16 37 18 35.3\n 41.3 69 70 101l7 8h-125l-9-7c-50.7-39.3-85-86-103-140h-46c0 4.7 6.3 18.7 19 42\n 18 35.3 40 67.3 66 96l9 9H0v40h399716l-9 9c-26 28.7-48 60.7-66 96-12.7 23.333\n-19 37.333-19 42h46c18-54 52.3-100.7 103-140l9-7h125l-7 8c-28.7 32-52 65.7-70\n 101-10.7 23.333-16 35.7-16 37 0 .7 7.7 1 23 1h22c27.3-71.3 75-127 143-167z",
      // tilde1 is a modified version of a glyph from the MnSymbol package
      tilde1: "M200 55.538c-77 0-168 73.953-177 73.953-3 0-7\n-2.175-9-5.437L2 97c-1-2-2-4-2-6 0-4 2-7 5-9l20-12C116 12 171 0 207 0c86 0\n 114 68 191 68 78 0 168-68 177-68 4 0 7 2 9 5l12 19c1 2.175 2 4.35 2 6.525 0\n 4.35-2 7.613-5 9.788l-19 13.05c-92 63.077-116.937 75.308-183 76.128\n-68.267.847-113-73.952-191-73.952z",
      // ditto tilde2, tilde3, & tilde4
      tilde2: "M344 55.266c-142 0-300.638 81.316-311.5 86.418\n-8.01 3.762-22.5 10.91-23.5 5.562L1 120c-1-2-1-3-1-4 0-5 3-9 8-10l18.4-9C160.9\n 31.9 283 0 358 0c148 0 188 122 331 122s314-97 326-97c4 0 8 2 10 7l7 21.114\nc1 2.14 1 3.21 1 4.28 0 5.347-3 9.626-7 10.696l-22.3 12.622C852.6 158.372 751\n 181.476 676 181.476c-149 0-189-126.21-332-126.21z",
      tilde3: "M786 59C457 59 32 175.242 13 175.242c-6 0-10-3.457\n-11-10.37L.15 138c-1-7 3-12 10-13l19.2-6.4C378.4 40.7 634.3 0 804.3 0c337 0\n 411.8 157 746.8 157 328 0 754-112 773-112 5 0 10 3 11 9l1 14.075c1 8.066-.697\n 16.595-6.697 17.492l-21.052 7.31c-367.9 98.146-609.15 122.696-778.15 122.696\n -338 0-409-156.573-744-156.573z",
      tilde4: "M786 58C457 58 32 177.487 13 177.487c-6 0-10-3.345\n-11-10.035L.15 143c-1-7 3-12 10-13l22-6.7C381.2 35 637.15 0 807.15 0c337 0 409\n 177 744 177 328 0 754-127 773-127 5 0 10 3 11 9l1 14.794c1 7.805-3 13.38-9\n 14.495l-20.7 5.574c-366.85 99.79-607.3 139.372-776.3 139.372-338 0-409\n -175.236-744-175.236z",
      // vec is from glyph U+20D7 in font KaTeX Main
      vec: "M377 20c0-5.333 1.833-10 5.5-14S391 0 397 0c4.667 0 8.667 1.667 12 5\n3.333 2.667 6.667 9 10 19 6.667 24.667 20.333 43.667 41 57 7.333 4.667 11\n10.667 11 18 0 6-1 10-3 12s-6.667 5-14 9c-28.667 14.667-53.667 35.667-75 63\n-1.333 1.333-3.167 3.5-5.5 6.5s-4 4.833-5 5.5c-1 .667-2.5 1.333-4.5 2s-4.333 1\n-7 1c-4.667 0-9.167-1.833-13.5-5.5S337 184 337 178c0-12.667 15.667-32.333 47-59\nH213l-171-1c-8.667-6-13-12.333-13-19 0-4.667 4.333-11.333 13-20h359\nc-16-25.333-24-45-24-59z",
      // widehat1 is a modified version of a glyph from the MnSymbol package
      widehat1: "M529 0h5l519 115c5 1 9 5 9 10 0 1-1 2-1 3l-4 22\nc-1 5-5 9-11 9h-2L532 67 19 159h-2c-5 0-9-4-11-9l-5-22c-1-6 2-12 8-13z",
      // ditto widehat2, widehat3, & widehat4
      widehat2: "M1181 0h2l1171 176c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 220h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
      widehat3: "M1181 0h2l1171 236c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 280h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
      widehat4: "M1181 0h2l1171 296c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 340h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
      // widecheck paths are all inverted versions of widehat
      widecheck1: "M529,159h5l519,-115c5,-1,9,-5,9,-10c0,-1,-1,-2,-1,-3l-4,-22c-1,\n-5,-5,-9,-11,-9h-2l-512,92l-513,-92h-2c-5,0,-9,4,-11,9l-5,22c-1,6,2,12,8,13z",
      widecheck2: "M1181,220h2l1171,-176c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,153l-1167,-153h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
      widecheck3: "M1181,280h2l1171,-236c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,213l-1167,-213h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
      widecheck4: "M1181,340h2l1171,-296c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,273l-1167,-273h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
      // The next ten paths support reaction arrows from the mhchem package.
      // Arrows for \ce{<-->} are offset from xAxis by 0.22ex, per mhchem in LaTeX
      // baraboveleftarrow is mostly from glyph U+2190 in font KaTeX Main
      baraboveleftarrow: "M400000 620h-399890l3 -3c68.7 -52.7 113.7 -120 135 -202\nc4 -14.7 6 -23 6 -25c0 -7.3 -7 -11 -21 -11c-8 0 -13.2 0.8 -15.5 2.5\nc-2.3 1.7 -4.2 5.8 -5.5 12.5c-1.3 4.7 -2.7 10.3 -4 17c-12 48.7 -34.8 92 -68.5 130\ns-74.2 66.3 -121.5 85c-10 4 -16 7.7 -18 11c0 8.7 6 14.3 18 17c47.3 18.7 87.8 47\n121.5 85s56.5 81.3 68.5 130c0.7 2 1.3 5 2 9s1.2 6.7 1.5 8c0.3 1.3 1 3.3 2 6\ns2.2 4.5 3.5 5.5c1.3 1 3.3 1.8 6 2.5s6 1 10 1c14 0 21 -3.7 21 -11\nc0 -2 -2 -10.3 -6 -25c-20 -79.3 -65 -146.7 -135 -202l-3 -3h399890z\nM100 620v40h399900v-40z M0 241v40h399900v-40zM0 241v40h399900v-40z",
      // rightarrowabovebar is mostly from glyph U+2192, KaTeX Main
      rightarrowabovebar: "M0 241v40h399891c-47.3 35.3-84 78-110 128-16.7 32\n-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20 11 8 0\n13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7 39\n-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85-40.5\n-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n151.7 139 205zm96 379h399894v40H0zm0 0h399904v40H0z",
      // The short left harpoon has 0.5em (i.e. 500 units) kern on the left end.
      // Ref from mhchem.sty: \rlap{\raisebox{-.22ex}{$\kern0.5em
      baraboveshortleftharpoon: "M507,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17\nc2,0.7,5,1,9,1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21\nc-32,-87.3,-82.7,-157.7,-152,-211c0,0,-3,-3,-3,-3l399351,0l0,-40\nc-398570,0,-399437,0,-399437,0z M593 435 v40 H399500 v-40z\nM0 281 v-40 H399908 v40z M0 281 v-40 H399908 v40z",
      rightharpoonaboveshortbar: "M0,241 l0,40c399126,0,399993,0,399993,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM0 241 v40 H399908 v-40z M0 475 v-40 H399500 v40z M0 475 v-40 H399500 v40z",
      shortbaraboveleftharpoon: "M7,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17c2,0.7,5,1,9,\n1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21c-32,-87.3,-82.7,-157.7,\n-152,-211c0,0,-3,-3,-3,-3l399907,0l0,-40c-399126,0,-399993,0,-399993,0z\nM93 435 v40 H400000 v-40z M500 241 v40 H400000 v-40z M500 241 v40 H400000 v-40z",
      shortrightharpoonabovebar: "M53,241l0,40c398570,0,399437,0,399437,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM500 241 v40 H399408 v-40z M500 435 v40 H400000 v-40z"
    };
    var tallDelim = function tallDelim2(label, midHeight) {
      switch (label) {
        case "lbrack":
          return "M403 1759 V84 H666 V0 H319 V1759 v" + midHeight + " v1759 v84 h347 v-84\nH403z M403 1759 V0 H319 V1759 v" + midHeight + " v1759 v84 h84z";
        case "rbrack":
          return "M347 1759 V0 H0 V84 H263 V1759 v" + midHeight + " v1759 H0 v84 H347z\nM347 1759 V0 H263 V1759 v" + midHeight + " v1759 h84z";
        case "vert":
          return "M145 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + midHeight + " v585 h43z";
        case "doublevert":
          return "M145 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + midHeight + " v585 h43z\nM367 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M410 15 H367 v585 v" + midHeight + " v585 h43z";
        case "lfloor":
          return "M319 602 V0 H403 V602 v" + midHeight + " v1715 h263 v84 H319z\nMM319 602 V0 H403 V602 v" + midHeight + " v1715 H319z";
        case "rfloor":
          return "M319 602 V0 H403 V602 v" + midHeight + " v1799 H0 v-84 H319z\nMM319 602 V0 H403 V602 v" + midHeight + " v1715 H319z";
        case "lceil":
          return "M403 1759 V84 H666 V0 H319 V1759 v" + midHeight + " v602 h84z\nM403 1759 V0 H319 V1759 v" + midHeight + " v602 h84z";
        case "rceil":
          return "M347 1759 V0 H0 V84 H263 V1759 v" + midHeight + " v602 h84z\nM347 1759 V0 h-84 V1759 v" + midHeight + " v602 h84z";
        case "lparen":
          return "M863,9c0,-2,-2,-5,-6,-9c0,0,-17,0,-17,0c-12.7,0,-19.3,0.3,-20,1\nc-5.3,5.3,-10.3,11,-15,17c-242.7,294.7,-395.3,682,-458,1162c-21.3,163.3,-33.3,349,\n-36,557 l0," + (midHeight + 84) + "c0.2,6,0,26,0,60c2,159.3,10,310.7,24,454c53.3,528,210,\n949.7,470,1265c4.7,6,9.7,11.7,15,17c0.7,0.7,7,1,19,1c0,0,18,0,18,0c4,-4,6,-7,6,-9\nc0,-2.7,-3.3,-8.7,-10,-18c-135.3,-192.7,-235.5,-414.3,-300.5,-665c-65,-250.7,-102.5,\n-544.7,-112.5,-882c-2,-104,-3,-167,-3,-189\nl0,-" + (midHeight + 92) + "c0,-162.7,5.7,-314,17,-454c20.7,-272,63.7,-513,129,-723c65.3,\n-210,155.3,-396.3,270,-559c6.7,-9.3,10,-15.3,10,-18z";
        case "rparen":
          return "M76,0c-16.7,0,-25,3,-25,9c0,2,2,6.3,6,13c21.3,28.7,42.3,60.3,\n63,95c96.7,156.7,172.8,332.5,228.5,527.5c55.7,195,92.8,416.5,111.5,664.5\nc11.3,139.3,17,290.7,17,454c0,28,1.7,43,3.3,45l0," + (midHeight + 9) + "\nc-3,4,-3.3,16.7,-3.3,38c0,162,-5.7,313.7,-17,455c-18.7,248,-55.8,469.3,-111.5,664\nc-55.7,194.7,-131.8,370.3,-228.5,527c-20.7,34.7,-41.7,66.3,-63,95c-2,3.3,-4,7,-6,11\nc0,7.3,5.7,11,17,11c0,0,11,0,11,0c9.3,0,14.3,-0.3,15,-1c5.3,-5.3,10.3,-11,15,-17\nc242.7,-294.7,395.3,-681.7,458,-1161c21.3,-164.7,33.3,-350.7,36,-558\nl0,-" + (midHeight + 144) + "c-2,-159.3,-10,-310.7,-24,-454c-53.3,-528,-210,-949.7,\n-470,-1265c-4.7,-6,-9.7,-11.7,-15,-17c-0.7,-0.7,-6.7,-1,-18,-1z";
        default:
          throw new Error("Unknown stretchy delimiter.");
      }
    };
    function isMathDomNode(node) {
      return "toText" in node;
    }
    var DocumentFragment = class {
      // Never used; needed for satisfying interface.
      constructor(children) {
        this.children = void 0;
        this.classes = void 0;
        this.height = void 0;
        this.depth = void 0;
        this.maxFontSize = void 0;
        this.style = void 0;
        this.children = children;
        this.classes = [];
        this.height = 0;
        this.depth = 0;
        this.maxFontSize = 0;
        this.style = {};
      }
      hasClass(className) {
        return this.classes.includes(className);
      }
      /** Convert the fragment into a node. */
      toNode() {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < this.children.length; i++) {
          frag.appendChild(this.children[i].toNode());
        }
        return frag;
      }
      /** Convert the fragment into HTML markup. */
      toMarkup() {
        var markup = "";
        for (var i = 0; i < this.children.length; i++) {
          markup += this.children[i].toMarkup();
        }
        return markup;
      }
      /**
       * Converts the math node into a string, similar to innerText. Applies to
       * MathDomNode's only.
       */
      toText() {
        return this.children.map((child) => {
          if (isMathDomNode(child)) {
            return child.toText();
          }
          throw new Error("Expected MathDomNode with toText, got " + child.constructor.name);
        }).join("");
      }
    };
    var ptPerUnit = {
      // https://en.wikibooks.org/wiki/LaTeX/Lengths and
      // https://tex.stackexchange.com/a/8263
      "pt": 1,
      // TeX point
      "mm": 7227 / 2540,
      // millimeter
      "cm": 7227 / 254,
      // centimeter
      "in": 72.27,
      // inch
      "bp": 803 / 800,
      // big (PostScript) points
      "pc": 12,
      // pica
      "dd": 1238 / 1157,
      // didot
      "cc": 14856 / 1157,
      // cicero (12 didot)
      "nd": 685 / 642,
      // new didot
      "nc": 1370 / 107,
      // new cicero (12 new didot)
      "sp": 1 / 65536,
      // scaled point (TeX's internal smallest unit)
      // https://tex.stackexchange.com/a/41371
      "px": 803 / 800
      // \pdfpxdimen defaults to 1 bp in pdfTeX and LuaTeX
    };
    var relativeUnit = {
      "ex": true,
      "em": true,
      "mu": true
    };
    var validUnit = function validUnit2(unit) {
      if (typeof unit !== "string") {
        unit = unit.unit;
      }
      return unit in ptPerUnit || unit in relativeUnit || unit === "ex";
    };
    var calculateSize = function calculateSize2(sizeValue, options) {
      var scale;
      if (sizeValue.unit in ptPerUnit) {
        scale = ptPerUnit[sizeValue.unit] / options.fontMetrics().ptPerEm / options.sizeMultiplier;
      } else if (sizeValue.unit === "mu") {
        scale = options.fontMetrics().cssEmPerMu;
      } else {
        var unitOptions;
        if (options.style.isTight()) {
          unitOptions = options.havingStyle(options.style.text());
        } else {
          unitOptions = options;
        }
        if (sizeValue.unit === "ex") {
          scale = unitOptions.fontMetrics().xHeight;
        } else if (sizeValue.unit === "em") {
          scale = unitOptions.fontMetrics().quad;
        } else {
          throw new ParseError("Invalid unit: '" + sizeValue.unit + "'");
        }
        if (unitOptions !== options) {
          scale *= unitOptions.sizeMultiplier / options.sizeMultiplier;
        }
      }
      return Math.min(sizeValue.number * scale, options.maxSize);
    };
    var makeEm = function makeEm2(n) {
      return +n.toFixed(4) + "em";
    };
    var createClass = function createClass2(classes) {
      return classes.filter((cls) => cls).join(" ");
    };
    var cssStyleToString = function cssStyleToString2(style) {
      var styles2 = "";
      for (var key of Object.keys(style)) {
        var value = style[key];
        if (value !== void 0) {
          styles2 += hyphenate(key) + ":" + value + ";";
        }
      }
      return styles2;
    };
    var initNode = function initNode2(classes, options, style) {
      this.classes = classes || [];
      this.attributes = {};
      this.height = 0;
      this.depth = 0;
      this.maxFontSize = 0;
      this.style = style || {};
      if (options) {
        if (options.style.isTight()) {
          this.classes.push("mtight");
        }
        var color = options.getColor();
        if (color) {
          this.style.color = color;
        }
      }
    };
    var toNode = function toNode2(tagName) {
      var node = document.createElement(tagName);
      node.className = createClass(this.classes);
      Object.assign(node.style, this.style);
      for (var attr of Object.keys(this.attributes)) {
        node.setAttribute(attr, this.attributes[attr]);
      }
      for (var i = 0; i < this.children.length; i++) {
        node.appendChild(this.children[i].toNode());
      }
      return node;
    };
    var invalidAttributeNameRegex = /[\s"'>/=\x00-\x1f]/;
    var toMarkup = function toMarkup2(tagName) {
      var markup = "<" + tagName;
      if (this.classes.length) {
        markup += ' class="' + escape(createClass(this.classes)) + '"';
      }
      var styles2 = cssStyleToString(this.style);
      if (styles2) {
        markup += ' style="' + escape(styles2) + '"';
      }
      for (var attr of Object.keys(this.attributes)) {
        if (invalidAttributeNameRegex.test(attr)) {
          throw new ParseError("Invalid attribute name '" + attr + "'");
        }
        markup += " " + attr + '="' + escape(this.attributes[attr]) + '"';
      }
      markup += ">";
      for (var i = 0; i < this.children.length; i++) {
        markup += this.children[i].toMarkup();
      }
      markup += "</" + tagName + ">";
      return markup;
    };
    var Span = class {
      constructor(classes, children, options, style) {
        this.children = void 0;
        this.attributes = void 0;
        this.classes = void 0;
        this.height = void 0;
        this.depth = void 0;
        this.width = void 0;
        this.maxFontSize = void 0;
        this.style = void 0;
        this.italic = void 0;
        initNode.call(this, classes, options, style);
        this.children = children || [];
      }
      /**
       * Sets an arbitrary attribute on the span. Warning: use this wisely. Not
       * all browsers support attributes the same, and having too many custom
       * attributes is probably bad.
       */
      setAttribute(attribute, value) {
        this.attributes[attribute] = value;
      }
      hasClass(className) {
        return this.classes.includes(className);
      }
      toNode() {
        return toNode.call(this, "span");
      }
      toMarkup() {
        return toMarkup.call(this, "span");
      }
    };
    var Anchor = class {
      constructor(href, classes, children, options) {
        this.children = void 0;
        this.attributes = void 0;
        this.classes = void 0;
        this.height = void 0;
        this.depth = void 0;
        this.maxFontSize = void 0;
        this.style = void 0;
        initNode.call(this, classes, options);
        this.children = children || [];
        this.setAttribute("href", href);
      }
      setAttribute(attribute, value) {
        this.attributes[attribute] = value;
      }
      hasClass(className) {
        return this.classes.includes(className);
      }
      toNode() {
        return toNode.call(this, "a");
      }
      toMarkup() {
        return toMarkup.call(this, "a");
      }
    };
    var Img = class {
      constructor(src, alt, style) {
        this.src = void 0;
        this.alt = void 0;
        this.classes = void 0;
        this.height = void 0;
        this.depth = void 0;
        this.maxFontSize = void 0;
        this.style = void 0;
        this.alt = alt;
        this.src = src;
        this.classes = ["mord"];
        this.height = 0;
        this.depth = 0;
        this.maxFontSize = 0;
        this.style = style;
      }
      hasClass(className) {
        return this.classes.includes(className);
      }
      toNode() {
        var node = document.createElement("img");
        node.src = this.src;
        node.alt = this.alt;
        node.className = "mord";
        Object.assign(node.style, this.style);
        return node;
      }
      toMarkup() {
        var markup = '<img src="' + escape(this.src) + '"' + (' alt="' + escape(this.alt) + '"');
        var styles2 = cssStyleToString(this.style);
        if (styles2) {
          markup += ' style="' + escape(styles2) + '"';
        }
        markup += "'/>";
        return markup;
      }
    };
    var iCombinations = {
      "\xEE": "\u0131\u0302",
      "\xEF": "\u0131\u0308",
      "\xED": "\u0131\u0301",
      // 'ī': '\u0131\u0304', // enable when we add Extended Latin
      "\xEC": "\u0131\u0300"
    };
    var SymbolNode = class {
      constructor(text2, height, depth, italic2, skew, width, classes, style) {
        this.text = void 0;
        this.height = void 0;
        this.depth = void 0;
        this.italic = void 0;
        this.skew = void 0;
        this.width = void 0;
        this.maxFontSize = void 0;
        this.classes = void 0;
        this.style = void 0;
        this.text = text2;
        this.height = height || 0;
        this.depth = depth || 0;
        this.italic = italic2 || 0;
        this.skew = skew || 0;
        this.width = width || 0;
        this.classes = classes || [];
        this.style = style || {};
        this.maxFontSize = 0;
        var script2 = scriptFromCodepoint(this.text.charCodeAt(0));
        if (script2) {
          this.classes.push(script2 + "_fallback");
        }
        if (/[îïíì]/.test(this.text)) {
          this.text = iCombinations[this.text];
        }
      }
      hasClass(className) {
        return this.classes.includes(className);
      }
      /**
       * Creates a text node or span from a symbol node. Note that a span is only
       * created if it is needed.
       */
      toNode() {
        var node = document.createTextNode(this.text);
        var span = null;
        if (this.italic > 0) {
          span = document.createElement("span");
          span.style.marginRight = makeEm(this.italic);
        }
        if (this.classes.length > 0) {
          span = span || document.createElement("span");
          span.className = createClass(this.classes);
        }
        if (Object.keys(this.style).length > 0) {
          span = span || document.createElement("span");
          Object.assign(span.style, this.style);
        }
        if (span) {
          span.appendChild(node);
          return span;
        } else {
          return node;
        }
      }
      /**
       * Creates markup for a symbol node.
       */
      toMarkup() {
        var needsSpan = false;
        var markup = "<span";
        if (this.classes.length) {
          needsSpan = true;
          markup += ' class="';
          markup += escape(createClass(this.classes));
          markup += '"';
        }
        var styles2 = "";
        if (this.italic > 0) {
          styles2 += "margin-right:" + makeEm(this.italic) + ";";
        }
        styles2 += cssStyleToString(this.style);
        if (styles2) {
          needsSpan = true;
          markup += ' style="' + escape(styles2) + '"';
        }
        var escaped = escape(this.text);
        if (needsSpan) {
          markup += ">";
          markup += escaped;
          markup += "</span>";
          return markup;
        } else {
          return escaped;
        }
      }
    };
    var SvgNode = class {
      constructor(children, attributes) {
        this.children = void 0;
        this.attributes = void 0;
        this.children = children || [];
        this.attributes = attributes || {};
      }
      toNode() {
        var svgNS = "http://www.w3.org/2000/svg";
        var node = document.createElementNS(svgNS, "svg");
        for (var attr of Object.keys(this.attributes)) {
          node.setAttribute(attr, this.attributes[attr]);
        }
        for (var i = 0; i < this.children.length; i++) {
          node.appendChild(this.children[i].toNode());
        }
        return node;
      }
      toMarkup() {
        var markup = '<svg xmlns="http://www.w3.org/2000/svg"';
        for (var attr of Object.keys(this.attributes)) {
          markup += " " + attr + '="' + escape(this.attributes[attr]) + '"';
        }
        markup += ">";
        for (var i = 0; i < this.children.length; i++) {
          markup += this.children[i].toMarkup();
        }
        markup += "</svg>";
        return markup;
      }
    };
    var PathNode = class {
      constructor(pathName, alternate) {
        this.pathName = void 0;
        this.alternate = void 0;
        this.pathName = pathName;
        this.alternate = alternate;
      }
      toNode() {
        var svgNS = "http://www.w3.org/2000/svg";
        var node = document.createElementNS(svgNS, "path");
        if (this.alternate) {
          node.setAttribute("d", this.alternate);
        } else {
          node.setAttribute("d", path[this.pathName]);
        }
        return node;
      }
      toMarkup() {
        if (this.alternate) {
          return '<path d="' + escape(this.alternate) + '"/>';
        } else {
          return '<path d="' + escape(path[this.pathName]) + '"/>';
        }
      }
    };
    var LineNode = class {
      constructor(attributes) {
        this.attributes = void 0;
        this.attributes = attributes || {};
      }
      toNode() {
        var svgNS = "http://www.w3.org/2000/svg";
        var node = document.createElementNS(svgNS, "line");
        for (var attr of Object.keys(this.attributes)) {
          node.setAttribute(attr, this.attributes[attr]);
        }
        return node;
      }
      toMarkup() {
        var markup = "<line";
        for (var attr of Object.keys(this.attributes)) {
          markup += " " + attr + '="' + escape(this.attributes[attr]) + '"';
        }
        markup += "/>";
        return markup;
      }
    };
    function assertSymbolDomNode(group) {
      if (group instanceof SymbolNode) {
        return group;
      } else {
        throw new Error("Expected symbolNode but got " + String(group) + ".");
      }
    }
    function assertSpan(group) {
      if (group instanceof Span) {
        return group;
      } else {
        throw new Error("Expected span<HtmlDomNode> but got " + String(group) + ".");
      }
    }
    var hasHtmlDomChildren = (node) => node instanceof Span || node instanceof Anchor || node instanceof DocumentFragment;
    var fontMetricsData = {
      "AMS-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "65": [0, 0.68889, 0, 0, 0.72222],
        "66": [0, 0.68889, 0, 0, 0.66667],
        "67": [0, 0.68889, 0, 0, 0.72222],
        "68": [0, 0.68889, 0, 0, 0.72222],
        "69": [0, 0.68889, 0, 0, 0.66667],
        "70": [0, 0.68889, 0, 0, 0.61111],
        "71": [0, 0.68889, 0, 0, 0.77778],
        "72": [0, 0.68889, 0, 0, 0.77778],
        "73": [0, 0.68889, 0, 0, 0.38889],
        "74": [0.16667, 0.68889, 0, 0, 0.5],
        "75": [0, 0.68889, 0, 0, 0.77778],
        "76": [0, 0.68889, 0, 0, 0.66667],
        "77": [0, 0.68889, 0, 0, 0.94445],
        "78": [0, 0.68889, 0, 0, 0.72222],
        "79": [0.16667, 0.68889, 0, 0, 0.77778],
        "80": [0, 0.68889, 0, 0, 0.61111],
        "81": [0.16667, 0.68889, 0, 0, 0.77778],
        "82": [0, 0.68889, 0, 0, 0.72222],
        "83": [0, 0.68889, 0, 0, 0.55556],
        "84": [0, 0.68889, 0, 0, 0.66667],
        "85": [0, 0.68889, 0, 0, 0.72222],
        "86": [0, 0.68889, 0, 0, 0.72222],
        "87": [0, 0.68889, 0, 0, 1],
        "88": [0, 0.68889, 0, 0, 0.72222],
        "89": [0, 0.68889, 0, 0, 0.72222],
        "90": [0, 0.68889, 0, 0, 0.66667],
        "107": [0, 0.68889, 0, 0, 0.55556],
        "160": [0, 0, 0, 0, 0.25],
        "165": [0, 0.675, 0.025, 0, 0.75],
        "174": [0.15559, 0.69224, 0, 0, 0.94666],
        "240": [0, 0.68889, 0, 0, 0.55556],
        "295": [0, 0.68889, 0, 0, 0.54028],
        "710": [0, 0.825, 0, 0, 2.33334],
        "732": [0, 0.9, 0, 0, 2.33334],
        "770": [0, 0.825, 0, 0, 2.33334],
        "771": [0, 0.9, 0, 0, 2.33334],
        "989": [0.08167, 0.58167, 0, 0, 0.77778],
        "1008": [0, 0.43056, 0.04028, 0, 0.66667],
        "8245": [0, 0.54986, 0, 0, 0.275],
        "8463": [0, 0.68889, 0, 0, 0.54028],
        "8487": [0, 0.68889, 0, 0, 0.72222],
        "8498": [0, 0.68889, 0, 0, 0.55556],
        "8502": [0, 0.68889, 0, 0, 0.66667],
        "8503": [0, 0.68889, 0, 0, 0.44445],
        "8504": [0, 0.68889, 0, 0, 0.66667],
        "8513": [0, 0.68889, 0, 0, 0.63889],
        "8592": [-0.03598, 0.46402, 0, 0, 0.5],
        "8594": [-0.03598, 0.46402, 0, 0, 0.5],
        "8602": [-0.13313, 0.36687, 0, 0, 1],
        "8603": [-0.13313, 0.36687, 0, 0, 1],
        "8606": [0.01354, 0.52239, 0, 0, 1],
        "8608": [0.01354, 0.52239, 0, 0, 1],
        "8610": [0.01354, 0.52239, 0, 0, 1.11111],
        "8611": [0.01354, 0.52239, 0, 0, 1.11111],
        "8619": [0, 0.54986, 0, 0, 1],
        "8620": [0, 0.54986, 0, 0, 1],
        "8621": [-0.13313, 0.37788, 0, 0, 1.38889],
        "8622": [-0.13313, 0.36687, 0, 0, 1],
        "8624": [0, 0.69224, 0, 0, 0.5],
        "8625": [0, 0.69224, 0, 0, 0.5],
        "8630": [0, 0.43056, 0, 0, 1],
        "8631": [0, 0.43056, 0, 0, 1],
        "8634": [0.08198, 0.58198, 0, 0, 0.77778],
        "8635": [0.08198, 0.58198, 0, 0, 0.77778],
        "8638": [0.19444, 0.69224, 0, 0, 0.41667],
        "8639": [0.19444, 0.69224, 0, 0, 0.41667],
        "8642": [0.19444, 0.69224, 0, 0, 0.41667],
        "8643": [0.19444, 0.69224, 0, 0, 0.41667],
        "8644": [0.1808, 0.675, 0, 0, 1],
        "8646": [0.1808, 0.675, 0, 0, 1],
        "8647": [0.1808, 0.675, 0, 0, 1],
        "8648": [0.19444, 0.69224, 0, 0, 0.83334],
        "8649": [0.1808, 0.675, 0, 0, 1],
        "8650": [0.19444, 0.69224, 0, 0, 0.83334],
        "8651": [0.01354, 0.52239, 0, 0, 1],
        "8652": [0.01354, 0.52239, 0, 0, 1],
        "8653": [-0.13313, 0.36687, 0, 0, 1],
        "8654": [-0.13313, 0.36687, 0, 0, 1],
        "8655": [-0.13313, 0.36687, 0, 0, 1],
        "8666": [0.13667, 0.63667, 0, 0, 1],
        "8667": [0.13667, 0.63667, 0, 0, 1],
        "8669": [-0.13313, 0.37788, 0, 0, 1],
        "8672": [-0.064, 0.437, 0, 0, 1.334],
        "8674": [-0.064, 0.437, 0, 0, 1.334],
        "8705": [0, 0.825, 0, 0, 0.5],
        "8708": [0, 0.68889, 0, 0, 0.55556],
        "8709": [0.08167, 0.58167, 0, 0, 0.77778],
        "8717": [0, 0.43056, 0, 0, 0.42917],
        "8722": [-0.03598, 0.46402, 0, 0, 0.5],
        "8724": [0.08198, 0.69224, 0, 0, 0.77778],
        "8726": [0.08167, 0.58167, 0, 0, 0.77778],
        "8733": [0, 0.69224, 0, 0, 0.77778],
        "8736": [0, 0.69224, 0, 0, 0.72222],
        "8737": [0, 0.69224, 0, 0, 0.72222],
        "8738": [0.03517, 0.52239, 0, 0, 0.72222],
        "8739": [0.08167, 0.58167, 0, 0, 0.22222],
        "8740": [0.25142, 0.74111, 0, 0, 0.27778],
        "8741": [0.08167, 0.58167, 0, 0, 0.38889],
        "8742": [0.25142, 0.74111, 0, 0, 0.5],
        "8756": [0, 0.69224, 0, 0, 0.66667],
        "8757": [0, 0.69224, 0, 0, 0.66667],
        "8764": [-0.13313, 0.36687, 0, 0, 0.77778],
        "8765": [-0.13313, 0.37788, 0, 0, 0.77778],
        "8769": [-0.13313, 0.36687, 0, 0, 0.77778],
        "8770": [-0.03625, 0.46375, 0, 0, 0.77778],
        "8774": [0.30274, 0.79383, 0, 0, 0.77778],
        "8776": [-0.01688, 0.48312, 0, 0, 0.77778],
        "8778": [0.08167, 0.58167, 0, 0, 0.77778],
        "8782": [0.06062, 0.54986, 0, 0, 0.77778],
        "8783": [0.06062, 0.54986, 0, 0, 0.77778],
        "8785": [0.08198, 0.58198, 0, 0, 0.77778],
        "8786": [0.08198, 0.58198, 0, 0, 0.77778],
        "8787": [0.08198, 0.58198, 0, 0, 0.77778],
        "8790": [0, 0.69224, 0, 0, 0.77778],
        "8791": [0.22958, 0.72958, 0, 0, 0.77778],
        "8796": [0.08198, 0.91667, 0, 0, 0.77778],
        "8806": [0.25583, 0.75583, 0, 0, 0.77778],
        "8807": [0.25583, 0.75583, 0, 0, 0.77778],
        "8808": [0.25142, 0.75726, 0, 0, 0.77778],
        "8809": [0.25142, 0.75726, 0, 0, 0.77778],
        "8812": [0.25583, 0.75583, 0, 0, 0.5],
        "8814": [0.20576, 0.70576, 0, 0, 0.77778],
        "8815": [0.20576, 0.70576, 0, 0, 0.77778],
        "8816": [0.30274, 0.79383, 0, 0, 0.77778],
        "8817": [0.30274, 0.79383, 0, 0, 0.77778],
        "8818": [0.22958, 0.72958, 0, 0, 0.77778],
        "8819": [0.22958, 0.72958, 0, 0, 0.77778],
        "8822": [0.1808, 0.675, 0, 0, 0.77778],
        "8823": [0.1808, 0.675, 0, 0, 0.77778],
        "8828": [0.13667, 0.63667, 0, 0, 0.77778],
        "8829": [0.13667, 0.63667, 0, 0, 0.77778],
        "8830": [0.22958, 0.72958, 0, 0, 0.77778],
        "8831": [0.22958, 0.72958, 0, 0, 0.77778],
        "8832": [0.20576, 0.70576, 0, 0, 0.77778],
        "8833": [0.20576, 0.70576, 0, 0, 0.77778],
        "8840": [0.30274, 0.79383, 0, 0, 0.77778],
        "8841": [0.30274, 0.79383, 0, 0, 0.77778],
        "8842": [0.13597, 0.63597, 0, 0, 0.77778],
        "8843": [0.13597, 0.63597, 0, 0, 0.77778],
        "8847": [0.03517, 0.54986, 0, 0, 0.77778],
        "8848": [0.03517, 0.54986, 0, 0, 0.77778],
        "8858": [0.08198, 0.58198, 0, 0, 0.77778],
        "8859": [0.08198, 0.58198, 0, 0, 0.77778],
        "8861": [0.08198, 0.58198, 0, 0, 0.77778],
        "8862": [0, 0.675, 0, 0, 0.77778],
        "8863": [0, 0.675, 0, 0, 0.77778],
        "8864": [0, 0.675, 0, 0, 0.77778],
        "8865": [0, 0.675, 0, 0, 0.77778],
        "8872": [0, 0.69224, 0, 0, 0.61111],
        "8873": [0, 0.69224, 0, 0, 0.72222],
        "8874": [0, 0.69224, 0, 0, 0.88889],
        "8876": [0, 0.68889, 0, 0, 0.61111],
        "8877": [0, 0.68889, 0, 0, 0.61111],
        "8878": [0, 0.68889, 0, 0, 0.72222],
        "8879": [0, 0.68889, 0, 0, 0.72222],
        "8882": [0.03517, 0.54986, 0, 0, 0.77778],
        "8883": [0.03517, 0.54986, 0, 0, 0.77778],
        "8884": [0.13667, 0.63667, 0, 0, 0.77778],
        "8885": [0.13667, 0.63667, 0, 0, 0.77778],
        "8888": [0, 0.54986, 0, 0, 1.11111],
        "8890": [0.19444, 0.43056, 0, 0, 0.55556],
        "8891": [0.19444, 0.69224, 0, 0, 0.61111],
        "8892": [0.19444, 0.69224, 0, 0, 0.61111],
        "8901": [0, 0.54986, 0, 0, 0.27778],
        "8903": [0.08167, 0.58167, 0, 0, 0.77778],
        "8905": [0.08167, 0.58167, 0, 0, 0.77778],
        "8906": [0.08167, 0.58167, 0, 0, 0.77778],
        "8907": [0, 0.69224, 0, 0, 0.77778],
        "8908": [0, 0.69224, 0, 0, 0.77778],
        "8909": [-0.03598, 0.46402, 0, 0, 0.77778],
        "8910": [0, 0.54986, 0, 0, 0.76042],
        "8911": [0, 0.54986, 0, 0, 0.76042],
        "8912": [0.03517, 0.54986, 0, 0, 0.77778],
        "8913": [0.03517, 0.54986, 0, 0, 0.77778],
        "8914": [0, 0.54986, 0, 0, 0.66667],
        "8915": [0, 0.54986, 0, 0, 0.66667],
        "8916": [0, 0.69224, 0, 0, 0.66667],
        "8918": [0.0391, 0.5391, 0, 0, 0.77778],
        "8919": [0.0391, 0.5391, 0, 0, 0.77778],
        "8920": [0.03517, 0.54986, 0, 0, 1.33334],
        "8921": [0.03517, 0.54986, 0, 0, 1.33334],
        "8922": [0.38569, 0.88569, 0, 0, 0.77778],
        "8923": [0.38569, 0.88569, 0, 0, 0.77778],
        "8926": [0.13667, 0.63667, 0, 0, 0.77778],
        "8927": [0.13667, 0.63667, 0, 0, 0.77778],
        "8928": [0.30274, 0.79383, 0, 0, 0.77778],
        "8929": [0.30274, 0.79383, 0, 0, 0.77778],
        "8934": [0.23222, 0.74111, 0, 0, 0.77778],
        "8935": [0.23222, 0.74111, 0, 0, 0.77778],
        "8936": [0.23222, 0.74111, 0, 0, 0.77778],
        "8937": [0.23222, 0.74111, 0, 0, 0.77778],
        "8938": [0.20576, 0.70576, 0, 0, 0.77778],
        "8939": [0.20576, 0.70576, 0, 0, 0.77778],
        "8940": [0.30274, 0.79383, 0, 0, 0.77778],
        "8941": [0.30274, 0.79383, 0, 0, 0.77778],
        "8994": [0.19444, 0.69224, 0, 0, 0.77778],
        "8995": [0.19444, 0.69224, 0, 0, 0.77778],
        "9416": [0.15559, 0.69224, 0, 0, 0.90222],
        "9484": [0, 0.69224, 0, 0, 0.5],
        "9488": [0, 0.69224, 0, 0, 0.5],
        "9492": [0, 0.37788, 0, 0, 0.5],
        "9496": [0, 0.37788, 0, 0, 0.5],
        "9585": [0.19444, 0.68889, 0, 0, 0.88889],
        "9586": [0.19444, 0.74111, 0, 0, 0.88889],
        "9632": [0, 0.675, 0, 0, 0.77778],
        "9633": [0, 0.675, 0, 0, 0.77778],
        "9650": [0, 0.54986, 0, 0, 0.72222],
        "9651": [0, 0.54986, 0, 0, 0.72222],
        "9654": [0.03517, 0.54986, 0, 0, 0.77778],
        "9660": [0, 0.54986, 0, 0, 0.72222],
        "9661": [0, 0.54986, 0, 0, 0.72222],
        "9664": [0.03517, 0.54986, 0, 0, 0.77778],
        "9674": [0.11111, 0.69224, 0, 0, 0.66667],
        "9733": [0.19444, 0.69224, 0, 0, 0.94445],
        "10003": [0, 0.69224, 0, 0, 0.83334],
        "10016": [0, 0.69224, 0, 0, 0.83334],
        "10731": [0.11111, 0.69224, 0, 0, 0.66667],
        "10846": [0.19444, 0.75583, 0, 0, 0.61111],
        "10877": [0.13667, 0.63667, 0, 0, 0.77778],
        "10878": [0.13667, 0.63667, 0, 0, 0.77778],
        "10885": [0.25583, 0.75583, 0, 0, 0.77778],
        "10886": [0.25583, 0.75583, 0, 0, 0.77778],
        "10887": [0.13597, 0.63597, 0, 0, 0.77778],
        "10888": [0.13597, 0.63597, 0, 0, 0.77778],
        "10889": [0.26167, 0.75726, 0, 0, 0.77778],
        "10890": [0.26167, 0.75726, 0, 0, 0.77778],
        "10891": [0.48256, 0.98256, 0, 0, 0.77778],
        "10892": [0.48256, 0.98256, 0, 0, 0.77778],
        "10901": [0.13667, 0.63667, 0, 0, 0.77778],
        "10902": [0.13667, 0.63667, 0, 0, 0.77778],
        "10933": [0.25142, 0.75726, 0, 0, 0.77778],
        "10934": [0.25142, 0.75726, 0, 0, 0.77778],
        "10935": [0.26167, 0.75726, 0, 0, 0.77778],
        "10936": [0.26167, 0.75726, 0, 0, 0.77778],
        "10937": [0.26167, 0.75726, 0, 0, 0.77778],
        "10938": [0.26167, 0.75726, 0, 0, 0.77778],
        "10949": [0.25583, 0.75583, 0, 0, 0.77778],
        "10950": [0.25583, 0.75583, 0, 0, 0.77778],
        "10955": [0.28481, 0.79383, 0, 0, 0.77778],
        "10956": [0.28481, 0.79383, 0, 0, 0.77778],
        "57350": [0.08167, 0.58167, 0, 0, 0.22222],
        "57351": [0.08167, 0.58167, 0, 0, 0.38889],
        "57352": [0.08167, 0.58167, 0, 0, 0.77778],
        "57353": [0, 0.43056, 0.04028, 0, 0.66667],
        "57356": [0.25142, 0.75726, 0, 0, 0.77778],
        "57357": [0.25142, 0.75726, 0, 0, 0.77778],
        "57358": [0.41951, 0.91951, 0, 0, 0.77778],
        "57359": [0.30274, 0.79383, 0, 0, 0.77778],
        "57360": [0.30274, 0.79383, 0, 0, 0.77778],
        "57361": [0.41951, 0.91951, 0, 0, 0.77778],
        "57366": [0.25142, 0.75726, 0, 0, 0.77778],
        "57367": [0.25142, 0.75726, 0, 0, 0.77778],
        "57368": [0.25142, 0.75726, 0, 0, 0.77778],
        "57369": [0.25142, 0.75726, 0, 0, 0.77778],
        "57370": [0.13597, 0.63597, 0, 0, 0.77778],
        "57371": [0.13597, 0.63597, 0, 0, 0.77778]
      },
      "Caligraphic-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "65": [0, 0.68333, 0, 0.19445, 0.79847],
        "66": [0, 0.68333, 0.03041, 0.13889, 0.65681],
        "67": [0, 0.68333, 0.05834, 0.13889, 0.52653],
        "68": [0, 0.68333, 0.02778, 0.08334, 0.77139],
        "69": [0, 0.68333, 0.08944, 0.11111, 0.52778],
        "70": [0, 0.68333, 0.09931, 0.11111, 0.71875],
        "71": [0.09722, 0.68333, 0.0593, 0.11111, 0.59487],
        "72": [0, 0.68333, 965e-5, 0.11111, 0.84452],
        "73": [0, 0.68333, 0.07382, 0, 0.54452],
        "74": [0.09722, 0.68333, 0.18472, 0.16667, 0.67778],
        "75": [0, 0.68333, 0.01445, 0.05556, 0.76195],
        "76": [0, 0.68333, 0, 0.13889, 0.68972],
        "77": [0, 0.68333, 0, 0.13889, 1.2009],
        "78": [0, 0.68333, 0.14736, 0.08334, 0.82049],
        "79": [0, 0.68333, 0.02778, 0.11111, 0.79611],
        "80": [0, 0.68333, 0.08222, 0.08334, 0.69556],
        "81": [0.09722, 0.68333, 0, 0.11111, 0.81667],
        "82": [0, 0.68333, 0, 0.08334, 0.8475],
        "83": [0, 0.68333, 0.075, 0.13889, 0.60556],
        "84": [0, 0.68333, 0.25417, 0, 0.54464],
        "85": [0, 0.68333, 0.09931, 0.08334, 0.62583],
        "86": [0, 0.68333, 0.08222, 0, 0.61278],
        "87": [0, 0.68333, 0.08222, 0.08334, 0.98778],
        "88": [0, 0.68333, 0.14643, 0.13889, 0.7133],
        "89": [0.09722, 0.68333, 0.08222, 0.08334, 0.66834],
        "90": [0, 0.68333, 0.07944, 0.13889, 0.72473],
        "160": [0, 0, 0, 0, 0.25]
      },
      "Fraktur-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "33": [0, 0.69141, 0, 0, 0.29574],
        "34": [0, 0.69141, 0, 0, 0.21471],
        "38": [0, 0.69141, 0, 0, 0.73786],
        "39": [0, 0.69141, 0, 0, 0.21201],
        "40": [0.24982, 0.74947, 0, 0, 0.38865],
        "41": [0.24982, 0.74947, 0, 0, 0.38865],
        "42": [0, 0.62119, 0, 0, 0.27764],
        "43": [0.08319, 0.58283, 0, 0, 0.75623],
        "44": [0, 0.10803, 0, 0, 0.27764],
        "45": [0.08319, 0.58283, 0, 0, 0.75623],
        "46": [0, 0.10803, 0, 0, 0.27764],
        "47": [0.24982, 0.74947, 0, 0, 0.50181],
        "48": [0, 0.47534, 0, 0, 0.50181],
        "49": [0, 0.47534, 0, 0, 0.50181],
        "50": [0, 0.47534, 0, 0, 0.50181],
        "51": [0.18906, 0.47534, 0, 0, 0.50181],
        "52": [0.18906, 0.47534, 0, 0, 0.50181],
        "53": [0.18906, 0.47534, 0, 0, 0.50181],
        "54": [0, 0.69141, 0, 0, 0.50181],
        "55": [0.18906, 0.47534, 0, 0, 0.50181],
        "56": [0, 0.69141, 0, 0, 0.50181],
        "57": [0.18906, 0.47534, 0, 0, 0.50181],
        "58": [0, 0.47534, 0, 0, 0.21606],
        "59": [0.12604, 0.47534, 0, 0, 0.21606],
        "61": [-0.13099, 0.36866, 0, 0, 0.75623],
        "63": [0, 0.69141, 0, 0, 0.36245],
        "65": [0, 0.69141, 0, 0, 0.7176],
        "66": [0, 0.69141, 0, 0, 0.88397],
        "67": [0, 0.69141, 0, 0, 0.61254],
        "68": [0, 0.69141, 0, 0, 0.83158],
        "69": [0, 0.69141, 0, 0, 0.66278],
        "70": [0.12604, 0.69141, 0, 0, 0.61119],
        "71": [0, 0.69141, 0, 0, 0.78539],
        "72": [0.06302, 0.69141, 0, 0, 0.7203],
        "73": [0, 0.69141, 0, 0, 0.55448],
        "74": [0.12604, 0.69141, 0, 0, 0.55231],
        "75": [0, 0.69141, 0, 0, 0.66845],
        "76": [0, 0.69141, 0, 0, 0.66602],
        "77": [0, 0.69141, 0, 0, 1.04953],
        "78": [0, 0.69141, 0, 0, 0.83212],
        "79": [0, 0.69141, 0, 0, 0.82699],
        "80": [0.18906, 0.69141, 0, 0, 0.82753],
        "81": [0.03781, 0.69141, 0, 0, 0.82699],
        "82": [0, 0.69141, 0, 0, 0.82807],
        "83": [0, 0.69141, 0, 0, 0.82861],
        "84": [0, 0.69141, 0, 0, 0.66899],
        "85": [0, 0.69141, 0, 0, 0.64576],
        "86": [0, 0.69141, 0, 0, 0.83131],
        "87": [0, 0.69141, 0, 0, 1.04602],
        "88": [0, 0.69141, 0, 0, 0.71922],
        "89": [0.18906, 0.69141, 0, 0, 0.83293],
        "90": [0.12604, 0.69141, 0, 0, 0.60201],
        "91": [0.24982, 0.74947, 0, 0, 0.27764],
        "93": [0.24982, 0.74947, 0, 0, 0.27764],
        "94": [0, 0.69141, 0, 0, 0.49965],
        "97": [0, 0.47534, 0, 0, 0.50046],
        "98": [0, 0.69141, 0, 0, 0.51315],
        "99": [0, 0.47534, 0, 0, 0.38946],
        "100": [0, 0.62119, 0, 0, 0.49857],
        "101": [0, 0.47534, 0, 0, 0.40053],
        "102": [0.18906, 0.69141, 0, 0, 0.32626],
        "103": [0.18906, 0.47534, 0, 0, 0.5037],
        "104": [0.18906, 0.69141, 0, 0, 0.52126],
        "105": [0, 0.69141, 0, 0, 0.27899],
        "106": [0, 0.69141, 0, 0, 0.28088],
        "107": [0, 0.69141, 0, 0, 0.38946],
        "108": [0, 0.69141, 0, 0, 0.27953],
        "109": [0, 0.47534, 0, 0, 0.76676],
        "110": [0, 0.47534, 0, 0, 0.52666],
        "111": [0, 0.47534, 0, 0, 0.48885],
        "112": [0.18906, 0.52396, 0, 0, 0.50046],
        "113": [0.18906, 0.47534, 0, 0, 0.48912],
        "114": [0, 0.47534, 0, 0, 0.38919],
        "115": [0, 0.47534, 0, 0, 0.44266],
        "116": [0, 0.62119, 0, 0, 0.33301],
        "117": [0, 0.47534, 0, 0, 0.5172],
        "118": [0, 0.52396, 0, 0, 0.5118],
        "119": [0, 0.52396, 0, 0, 0.77351],
        "120": [0.18906, 0.47534, 0, 0, 0.38865],
        "121": [0.18906, 0.47534, 0, 0, 0.49884],
        "122": [0.18906, 0.47534, 0, 0, 0.39054],
        "160": [0, 0, 0, 0, 0.25],
        "8216": [0, 0.69141, 0, 0, 0.21471],
        "8217": [0, 0.69141, 0, 0, 0.21471],
        "58112": [0, 0.62119, 0, 0, 0.49749],
        "58113": [0, 0.62119, 0, 0, 0.4983],
        "58114": [0.18906, 0.69141, 0, 0, 0.33328],
        "58115": [0.18906, 0.69141, 0, 0, 0.32923],
        "58116": [0.18906, 0.47534, 0, 0, 0.50343],
        "58117": [0, 0.69141, 0, 0, 0.33301],
        "58118": [0, 0.62119, 0, 0, 0.33409],
        "58119": [0, 0.47534, 0, 0, 0.50073]
      },
      "Main-Bold": {
        "32": [0, 0, 0, 0, 0.25],
        "33": [0, 0.69444, 0, 0, 0.35],
        "34": [0, 0.69444, 0, 0, 0.60278],
        "35": [0.19444, 0.69444, 0, 0, 0.95833],
        "36": [0.05556, 0.75, 0, 0, 0.575],
        "37": [0.05556, 0.75, 0, 0, 0.95833],
        "38": [0, 0.69444, 0, 0, 0.89444],
        "39": [0, 0.69444, 0, 0, 0.31944],
        "40": [0.25, 0.75, 0, 0, 0.44722],
        "41": [0.25, 0.75, 0, 0, 0.44722],
        "42": [0, 0.75, 0, 0, 0.575],
        "43": [0.13333, 0.63333, 0, 0, 0.89444],
        "44": [0.19444, 0.15556, 0, 0, 0.31944],
        "45": [0, 0.44444, 0, 0, 0.38333],
        "46": [0, 0.15556, 0, 0, 0.31944],
        "47": [0.25, 0.75, 0, 0, 0.575],
        "48": [0, 0.64444, 0, 0, 0.575],
        "49": [0, 0.64444, 0, 0, 0.575],
        "50": [0, 0.64444, 0, 0, 0.575],
        "51": [0, 0.64444, 0, 0, 0.575],
        "52": [0, 0.64444, 0, 0, 0.575],
        "53": [0, 0.64444, 0, 0, 0.575],
        "54": [0, 0.64444, 0, 0, 0.575],
        "55": [0, 0.64444, 0, 0, 0.575],
        "56": [0, 0.64444, 0, 0, 0.575],
        "57": [0, 0.64444, 0, 0, 0.575],
        "58": [0, 0.44444, 0, 0, 0.31944],
        "59": [0.19444, 0.44444, 0, 0, 0.31944],
        "60": [0.08556, 0.58556, 0, 0, 0.89444],
        "61": [-0.10889, 0.39111, 0, 0, 0.89444],
        "62": [0.08556, 0.58556, 0, 0, 0.89444],
        "63": [0, 0.69444, 0, 0, 0.54305],
        "64": [0, 0.69444, 0, 0, 0.89444],
        "65": [0, 0.68611, 0, 0, 0.86944],
        "66": [0, 0.68611, 0, 0, 0.81805],
        "67": [0, 0.68611, 0, 0, 0.83055],
        "68": [0, 0.68611, 0, 0, 0.88194],
        "69": [0, 0.68611, 0, 0, 0.75555],
        "70": [0, 0.68611, 0, 0, 0.72361],
        "71": [0, 0.68611, 0, 0, 0.90416],
        "72": [0, 0.68611, 0, 0, 0.9],
        "73": [0, 0.68611, 0, 0, 0.43611],
        "74": [0, 0.68611, 0, 0, 0.59444],
        "75": [0, 0.68611, 0, 0, 0.90138],
        "76": [0, 0.68611, 0, 0, 0.69166],
        "77": [0, 0.68611, 0, 0, 1.09166],
        "78": [0, 0.68611, 0, 0, 0.9],
        "79": [0, 0.68611, 0, 0, 0.86388],
        "80": [0, 0.68611, 0, 0, 0.78611],
        "81": [0.19444, 0.68611, 0, 0, 0.86388],
        "82": [0, 0.68611, 0, 0, 0.8625],
        "83": [0, 0.68611, 0, 0, 0.63889],
        "84": [0, 0.68611, 0, 0, 0.8],
        "85": [0, 0.68611, 0, 0, 0.88472],
        "86": [0, 0.68611, 0.01597, 0, 0.86944],
        "87": [0, 0.68611, 0.01597, 0, 1.18888],
        "88": [0, 0.68611, 0, 0, 0.86944],
        "89": [0, 0.68611, 0.02875, 0, 0.86944],
        "90": [0, 0.68611, 0, 0, 0.70277],
        "91": [0.25, 0.75, 0, 0, 0.31944],
        "92": [0.25, 0.75, 0, 0, 0.575],
        "93": [0.25, 0.75, 0, 0, 0.31944],
        "94": [0, 0.69444, 0, 0, 0.575],
        "95": [0.31, 0.13444, 0.03194, 0, 0.575],
        "97": [0, 0.44444, 0, 0, 0.55902],
        "98": [0, 0.69444, 0, 0, 0.63889],
        "99": [0, 0.44444, 0, 0, 0.51111],
        "100": [0, 0.69444, 0, 0, 0.63889],
        "101": [0, 0.44444, 0, 0, 0.52708],
        "102": [0, 0.69444, 0.10903, 0, 0.35139],
        "103": [0.19444, 0.44444, 0.01597, 0, 0.575],
        "104": [0, 0.69444, 0, 0, 0.63889],
        "105": [0, 0.69444, 0, 0, 0.31944],
        "106": [0.19444, 0.69444, 0, 0, 0.35139],
        "107": [0, 0.69444, 0, 0, 0.60694],
        "108": [0, 0.69444, 0, 0, 0.31944],
        "109": [0, 0.44444, 0, 0, 0.95833],
        "110": [0, 0.44444, 0, 0, 0.63889],
        "111": [0, 0.44444, 0, 0, 0.575],
        "112": [0.19444, 0.44444, 0, 0, 0.63889],
        "113": [0.19444, 0.44444, 0, 0, 0.60694],
        "114": [0, 0.44444, 0, 0, 0.47361],
        "115": [0, 0.44444, 0, 0, 0.45361],
        "116": [0, 0.63492, 0, 0, 0.44722],
        "117": [0, 0.44444, 0, 0, 0.63889],
        "118": [0, 0.44444, 0.01597, 0, 0.60694],
        "119": [0, 0.44444, 0.01597, 0, 0.83055],
        "120": [0, 0.44444, 0, 0, 0.60694],
        "121": [0.19444, 0.44444, 0.01597, 0, 0.60694],
        "122": [0, 0.44444, 0, 0, 0.51111],
        "123": [0.25, 0.75, 0, 0, 0.575],
        "124": [0.25, 0.75, 0, 0, 0.31944],
        "125": [0.25, 0.75, 0, 0, 0.575],
        "126": [0.35, 0.34444, 0, 0, 0.575],
        "160": [0, 0, 0, 0, 0.25],
        "163": [0, 0.69444, 0, 0, 0.86853],
        "168": [0, 0.69444, 0, 0, 0.575],
        "172": [0, 0.44444, 0, 0, 0.76666],
        "176": [0, 0.69444, 0, 0, 0.86944],
        "177": [0.13333, 0.63333, 0, 0, 0.89444],
        "184": [0.17014, 0, 0, 0, 0.51111],
        "198": [0, 0.68611, 0, 0, 1.04166],
        "215": [0.13333, 0.63333, 0, 0, 0.89444],
        "216": [0.04861, 0.73472, 0, 0, 0.89444],
        "223": [0, 0.69444, 0, 0, 0.59722],
        "230": [0, 0.44444, 0, 0, 0.83055],
        "247": [0.13333, 0.63333, 0, 0, 0.89444],
        "248": [0.09722, 0.54167, 0, 0, 0.575],
        "305": [0, 0.44444, 0, 0, 0.31944],
        "338": [0, 0.68611, 0, 0, 1.16944],
        "339": [0, 0.44444, 0, 0, 0.89444],
        "567": [0.19444, 0.44444, 0, 0, 0.35139],
        "710": [0, 0.69444, 0, 0, 0.575],
        "711": [0, 0.63194, 0, 0, 0.575],
        "713": [0, 0.59611, 0, 0, 0.575],
        "714": [0, 0.69444, 0, 0, 0.575],
        "715": [0, 0.69444, 0, 0, 0.575],
        "728": [0, 0.69444, 0, 0, 0.575],
        "729": [0, 0.69444, 0, 0, 0.31944],
        "730": [0, 0.69444, 0, 0, 0.86944],
        "732": [0, 0.69444, 0, 0, 0.575],
        "733": [0, 0.69444, 0, 0, 0.575],
        "915": [0, 0.68611, 0, 0, 0.69166],
        "916": [0, 0.68611, 0, 0, 0.95833],
        "920": [0, 0.68611, 0, 0, 0.89444],
        "923": [0, 0.68611, 0, 0, 0.80555],
        "926": [0, 0.68611, 0, 0, 0.76666],
        "928": [0, 0.68611, 0, 0, 0.9],
        "931": [0, 0.68611, 0, 0, 0.83055],
        "933": [0, 0.68611, 0, 0, 0.89444],
        "934": [0, 0.68611, 0, 0, 0.83055],
        "936": [0, 0.68611, 0, 0, 0.89444],
        "937": [0, 0.68611, 0, 0, 0.83055],
        "8211": [0, 0.44444, 0.03194, 0, 0.575],
        "8212": [0, 0.44444, 0.03194, 0, 1.14999],
        "8216": [0, 0.69444, 0, 0, 0.31944],
        "8217": [0, 0.69444, 0, 0, 0.31944],
        "8220": [0, 0.69444, 0, 0, 0.60278],
        "8221": [0, 0.69444, 0, 0, 0.60278],
        "8224": [0.19444, 0.69444, 0, 0, 0.51111],
        "8225": [0.19444, 0.69444, 0, 0, 0.51111],
        "8242": [0, 0.55556, 0, 0, 0.34444],
        "8407": [0, 0.72444, 0.15486, 0, 0.575],
        "8463": [0, 0.69444, 0, 0, 0.66759],
        "8465": [0, 0.69444, 0, 0, 0.83055],
        "8467": [0, 0.69444, 0, 0, 0.47361],
        "8472": [0.19444, 0.44444, 0, 0, 0.74027],
        "8476": [0, 0.69444, 0, 0, 0.83055],
        "8501": [0, 0.69444, 0, 0, 0.70277],
        "8592": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8593": [0.19444, 0.69444, 0, 0, 0.575],
        "8594": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8595": [0.19444, 0.69444, 0, 0, 0.575],
        "8596": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8597": [0.25, 0.75, 0, 0, 0.575],
        "8598": [0.19444, 0.69444, 0, 0, 1.14999],
        "8599": [0.19444, 0.69444, 0, 0, 1.14999],
        "8600": [0.19444, 0.69444, 0, 0, 1.14999],
        "8601": [0.19444, 0.69444, 0, 0, 1.14999],
        "8636": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8637": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8640": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8641": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8656": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8657": [0.19444, 0.69444, 0, 0, 0.70277],
        "8658": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8659": [0.19444, 0.69444, 0, 0, 0.70277],
        "8660": [-0.10889, 0.39111, 0, 0, 1.14999],
        "8661": [0.25, 0.75, 0, 0, 0.70277],
        "8704": [0, 0.69444, 0, 0, 0.63889],
        "8706": [0, 0.69444, 0.06389, 0, 0.62847],
        "8707": [0, 0.69444, 0, 0, 0.63889],
        "8709": [0.05556, 0.75, 0, 0, 0.575],
        "8711": [0, 0.68611, 0, 0, 0.95833],
        "8712": [0.08556, 0.58556, 0, 0, 0.76666],
        "8715": [0.08556, 0.58556, 0, 0, 0.76666],
        "8722": [0.13333, 0.63333, 0, 0, 0.89444],
        "8723": [0.13333, 0.63333, 0, 0, 0.89444],
        "8725": [0.25, 0.75, 0, 0, 0.575],
        "8726": [0.25, 0.75, 0, 0, 0.575],
        "8727": [-0.02778, 0.47222, 0, 0, 0.575],
        "8728": [-0.02639, 0.47361, 0, 0, 0.575],
        "8729": [-0.02639, 0.47361, 0, 0, 0.575],
        "8730": [0.18, 0.82, 0, 0, 0.95833],
        "8733": [0, 0.44444, 0, 0, 0.89444],
        "8734": [0, 0.44444, 0, 0, 1.14999],
        "8736": [0, 0.69224, 0, 0, 0.72222],
        "8739": [0.25, 0.75, 0, 0, 0.31944],
        "8741": [0.25, 0.75, 0, 0, 0.575],
        "8743": [0, 0.55556, 0, 0, 0.76666],
        "8744": [0, 0.55556, 0, 0, 0.76666],
        "8745": [0, 0.55556, 0, 0, 0.76666],
        "8746": [0, 0.55556, 0, 0, 0.76666],
        "8747": [0.19444, 0.69444, 0.12778, 0, 0.56875],
        "8764": [-0.10889, 0.39111, 0, 0, 0.89444],
        "8768": [0.19444, 0.69444, 0, 0, 0.31944],
        "8771": [222e-5, 0.50222, 0, 0, 0.89444],
        "8773": [0.027, 0.638, 0, 0, 0.894],
        "8776": [0.02444, 0.52444, 0, 0, 0.89444],
        "8781": [222e-5, 0.50222, 0, 0, 0.89444],
        "8801": [222e-5, 0.50222, 0, 0, 0.89444],
        "8804": [0.19667, 0.69667, 0, 0, 0.89444],
        "8805": [0.19667, 0.69667, 0, 0, 0.89444],
        "8810": [0.08556, 0.58556, 0, 0, 1.14999],
        "8811": [0.08556, 0.58556, 0, 0, 1.14999],
        "8826": [0.08556, 0.58556, 0, 0, 0.89444],
        "8827": [0.08556, 0.58556, 0, 0, 0.89444],
        "8834": [0.08556, 0.58556, 0, 0, 0.89444],
        "8835": [0.08556, 0.58556, 0, 0, 0.89444],
        "8838": [0.19667, 0.69667, 0, 0, 0.89444],
        "8839": [0.19667, 0.69667, 0, 0, 0.89444],
        "8846": [0, 0.55556, 0, 0, 0.76666],
        "8849": [0.19667, 0.69667, 0, 0, 0.89444],
        "8850": [0.19667, 0.69667, 0, 0, 0.89444],
        "8851": [0, 0.55556, 0, 0, 0.76666],
        "8852": [0, 0.55556, 0, 0, 0.76666],
        "8853": [0.13333, 0.63333, 0, 0, 0.89444],
        "8854": [0.13333, 0.63333, 0, 0, 0.89444],
        "8855": [0.13333, 0.63333, 0, 0, 0.89444],
        "8856": [0.13333, 0.63333, 0, 0, 0.89444],
        "8857": [0.13333, 0.63333, 0, 0, 0.89444],
        "8866": [0, 0.69444, 0, 0, 0.70277],
        "8867": [0, 0.69444, 0, 0, 0.70277],
        "8868": [0, 0.69444, 0, 0, 0.89444],
        "8869": [0, 0.69444, 0, 0, 0.89444],
        "8900": [-0.02639, 0.47361, 0, 0, 0.575],
        "8901": [-0.02639, 0.47361, 0, 0, 0.31944],
        "8902": [-0.02778, 0.47222, 0, 0, 0.575],
        "8968": [0.25, 0.75, 0, 0, 0.51111],
        "8969": [0.25, 0.75, 0, 0, 0.51111],
        "8970": [0.25, 0.75, 0, 0, 0.51111],
        "8971": [0.25, 0.75, 0, 0, 0.51111],
        "8994": [-0.13889, 0.36111, 0, 0, 1.14999],
        "8995": [-0.13889, 0.36111, 0, 0, 1.14999],
        "9651": [0.19444, 0.69444, 0, 0, 1.02222],
        "9657": [-0.02778, 0.47222, 0, 0, 0.575],
        "9661": [0.19444, 0.69444, 0, 0, 1.02222],
        "9667": [-0.02778, 0.47222, 0, 0, 0.575],
        "9711": [0.19444, 0.69444, 0, 0, 1.14999],
        "9824": [0.12963, 0.69444, 0, 0, 0.89444],
        "9825": [0.12963, 0.69444, 0, 0, 0.89444],
        "9826": [0.12963, 0.69444, 0, 0, 0.89444],
        "9827": [0.12963, 0.69444, 0, 0, 0.89444],
        "9837": [0, 0.75, 0, 0, 0.44722],
        "9838": [0.19444, 0.69444, 0, 0, 0.44722],
        "9839": [0.19444, 0.69444, 0, 0, 0.44722],
        "10216": [0.25, 0.75, 0, 0, 0.44722],
        "10217": [0.25, 0.75, 0, 0, 0.44722],
        "10815": [0, 0.68611, 0, 0, 0.9],
        "10927": [0.19667, 0.69667, 0, 0, 0.89444],
        "10928": [0.19667, 0.69667, 0, 0, 0.89444],
        "57376": [0.19444, 0.69444, 0, 0, 0]
      },
      "Main-BoldItalic": {
        "32": [0, 0, 0, 0, 0.25],
        "33": [0, 0.69444, 0.11417, 0, 0.38611],
        "34": [0, 0.69444, 0.07939, 0, 0.62055],
        "35": [0.19444, 0.69444, 0.06833, 0, 0.94444],
        "37": [0.05556, 0.75, 0.12861, 0, 0.94444],
        "38": [0, 0.69444, 0.08528, 0, 0.88555],
        "39": [0, 0.69444, 0.12945, 0, 0.35555],
        "40": [0.25, 0.75, 0.15806, 0, 0.47333],
        "41": [0.25, 0.75, 0.03306, 0, 0.47333],
        "42": [0, 0.75, 0.14333, 0, 0.59111],
        "43": [0.10333, 0.60333, 0.03306, 0, 0.88555],
        "44": [0.19444, 0.14722, 0, 0, 0.35555],
        "45": [0, 0.44444, 0.02611, 0, 0.41444],
        "46": [0, 0.14722, 0, 0, 0.35555],
        "47": [0.25, 0.75, 0.15806, 0, 0.59111],
        "48": [0, 0.64444, 0.13167, 0, 0.59111],
        "49": [0, 0.64444, 0.13167, 0, 0.59111],
        "50": [0, 0.64444, 0.13167, 0, 0.59111],
        "51": [0, 0.64444, 0.13167, 0, 0.59111],
        "52": [0.19444, 0.64444, 0.13167, 0, 0.59111],
        "53": [0, 0.64444, 0.13167, 0, 0.59111],
        "54": [0, 0.64444, 0.13167, 0, 0.59111],
        "55": [0.19444, 0.64444, 0.13167, 0, 0.59111],
        "56": [0, 0.64444, 0.13167, 0, 0.59111],
        "57": [0, 0.64444, 0.13167, 0, 0.59111],
        "58": [0, 0.44444, 0.06695, 0, 0.35555],
        "59": [0.19444, 0.44444, 0.06695, 0, 0.35555],
        "61": [-0.10889, 0.39111, 0.06833, 0, 0.88555],
        "63": [0, 0.69444, 0.11472, 0, 0.59111],
        "64": [0, 0.69444, 0.09208, 0, 0.88555],
        "65": [0, 0.68611, 0, 0, 0.86555],
        "66": [0, 0.68611, 0.0992, 0, 0.81666],
        "67": [0, 0.68611, 0.14208, 0, 0.82666],
        "68": [0, 0.68611, 0.09062, 0, 0.87555],
        "69": [0, 0.68611, 0.11431, 0, 0.75666],
        "70": [0, 0.68611, 0.12903, 0, 0.72722],
        "71": [0, 0.68611, 0.07347, 0, 0.89527],
        "72": [0, 0.68611, 0.17208, 0, 0.8961],
        "73": [0, 0.68611, 0.15681, 0, 0.47166],
        "74": [0, 0.68611, 0.145, 0, 0.61055],
        "75": [0, 0.68611, 0.14208, 0, 0.89499],
        "76": [0, 0.68611, 0, 0, 0.69777],
        "77": [0, 0.68611, 0.17208, 0, 1.07277],
        "78": [0, 0.68611, 0.17208, 0, 0.8961],
        "79": [0, 0.68611, 0.09062, 0, 0.85499],
        "80": [0, 0.68611, 0.0992, 0, 0.78721],
        "81": [0.19444, 0.68611, 0.09062, 0, 0.85499],
        "82": [0, 0.68611, 0.02559, 0, 0.85944],
        "83": [0, 0.68611, 0.11264, 0, 0.64999],
        "84": [0, 0.68611, 0.12903, 0, 0.7961],
        "85": [0, 0.68611, 0.17208, 0, 0.88083],
        "86": [0, 0.68611, 0.18625, 0, 0.86555],
        "87": [0, 0.68611, 0.18625, 0, 1.15999],
        "88": [0, 0.68611, 0.15681, 0, 0.86555],
        "89": [0, 0.68611, 0.19803, 0, 0.86555],
        "90": [0, 0.68611, 0.14208, 0, 0.70888],
        "91": [0.25, 0.75, 0.1875, 0, 0.35611],
        "93": [0.25, 0.75, 0.09972, 0, 0.35611],
        "94": [0, 0.69444, 0.06709, 0, 0.59111],
        "95": [0.31, 0.13444, 0.09811, 0, 0.59111],
        "97": [0, 0.44444, 0.09426, 0, 0.59111],
        "98": [0, 0.69444, 0.07861, 0, 0.53222],
        "99": [0, 0.44444, 0.05222, 0, 0.53222],
        "100": [0, 0.69444, 0.10861, 0, 0.59111],
        "101": [0, 0.44444, 0.085, 0, 0.53222],
        "102": [0.19444, 0.69444, 0.21778, 0, 0.4],
        "103": [0.19444, 0.44444, 0.105, 0, 0.53222],
        "104": [0, 0.69444, 0.09426, 0, 0.59111],
        "105": [0, 0.69326, 0.11387, 0, 0.35555],
        "106": [0.19444, 0.69326, 0.1672, 0, 0.35555],
        "107": [0, 0.69444, 0.11111, 0, 0.53222],
        "108": [0, 0.69444, 0.10861, 0, 0.29666],
        "109": [0, 0.44444, 0.09426, 0, 0.94444],
        "110": [0, 0.44444, 0.09426, 0, 0.64999],
        "111": [0, 0.44444, 0.07861, 0, 0.59111],
        "112": [0.19444, 0.44444, 0.07861, 0, 0.59111],
        "113": [0.19444, 0.44444, 0.105, 0, 0.53222],
        "114": [0, 0.44444, 0.11111, 0, 0.50167],
        "115": [0, 0.44444, 0.08167, 0, 0.48694],
        "116": [0, 0.63492, 0.09639, 0, 0.385],
        "117": [0, 0.44444, 0.09426, 0, 0.62055],
        "118": [0, 0.44444, 0.11111, 0, 0.53222],
        "119": [0, 0.44444, 0.11111, 0, 0.76777],
        "120": [0, 0.44444, 0.12583, 0, 0.56055],
        "121": [0.19444, 0.44444, 0.105, 0, 0.56166],
        "122": [0, 0.44444, 0.13889, 0, 0.49055],
        "126": [0.35, 0.34444, 0.11472, 0, 0.59111],
        "160": [0, 0, 0, 0, 0.25],
        "168": [0, 0.69444, 0.11473, 0, 0.59111],
        "176": [0, 0.69444, 0, 0, 0.94888],
        "184": [0.17014, 0, 0, 0, 0.53222],
        "198": [0, 0.68611, 0.11431, 0, 1.02277],
        "216": [0.04861, 0.73472, 0.09062, 0, 0.88555],
        "223": [0.19444, 0.69444, 0.09736, 0, 0.665],
        "230": [0, 0.44444, 0.085, 0, 0.82666],
        "248": [0.09722, 0.54167, 0.09458, 0, 0.59111],
        "305": [0, 0.44444, 0.09426, 0, 0.35555],
        "338": [0, 0.68611, 0.11431, 0, 1.14054],
        "339": [0, 0.44444, 0.085, 0, 0.82666],
        "567": [0.19444, 0.44444, 0.04611, 0, 0.385],
        "710": [0, 0.69444, 0.06709, 0, 0.59111],
        "711": [0, 0.63194, 0.08271, 0, 0.59111],
        "713": [0, 0.59444, 0.10444, 0, 0.59111],
        "714": [0, 0.69444, 0.08528, 0, 0.59111],
        "715": [0, 0.69444, 0, 0, 0.59111],
        "728": [0, 0.69444, 0.10333, 0, 0.59111],
        "729": [0, 0.69444, 0.12945, 0, 0.35555],
        "730": [0, 0.69444, 0, 0, 0.94888],
        "732": [0, 0.69444, 0.11472, 0, 0.59111],
        "733": [0, 0.69444, 0.11472, 0, 0.59111],
        "915": [0, 0.68611, 0.12903, 0, 0.69777],
        "916": [0, 0.68611, 0, 0, 0.94444],
        "920": [0, 0.68611, 0.09062, 0, 0.88555],
        "923": [0, 0.68611, 0, 0, 0.80666],
        "926": [0, 0.68611, 0.15092, 0, 0.76777],
        "928": [0, 0.68611, 0.17208, 0, 0.8961],
        "931": [0, 0.68611, 0.11431, 0, 0.82666],
        "933": [0, 0.68611, 0.10778, 0, 0.88555],
        "934": [0, 0.68611, 0.05632, 0, 0.82666],
        "936": [0, 0.68611, 0.10778, 0, 0.88555],
        "937": [0, 0.68611, 0.0992, 0, 0.82666],
        "8211": [0, 0.44444, 0.09811, 0, 0.59111],
        "8212": [0, 0.44444, 0.09811, 0, 1.18221],
        "8216": [0, 0.69444, 0.12945, 0, 0.35555],
        "8217": [0, 0.69444, 0.12945, 0, 0.35555],
        "8220": [0, 0.69444, 0.16772, 0, 0.62055],
        "8221": [0, 0.69444, 0.07939, 0, 0.62055]
      },
      "Main-Italic": {
        "32": [0, 0, 0, 0, 0.25],
        "33": [0, 0.69444, 0.12417, 0, 0.30667],
        "34": [0, 0.69444, 0.06961, 0, 0.51444],
        "35": [0.19444, 0.69444, 0.06616, 0, 0.81777],
        "37": [0.05556, 0.75, 0.13639, 0, 0.81777],
        "38": [0, 0.69444, 0.09694, 0, 0.76666],
        "39": [0, 0.69444, 0.12417, 0, 0.30667],
        "40": [0.25, 0.75, 0.16194, 0, 0.40889],
        "41": [0.25, 0.75, 0.03694, 0, 0.40889],
        "42": [0, 0.75, 0.14917, 0, 0.51111],
        "43": [0.05667, 0.56167, 0.03694, 0, 0.76666],
        "44": [0.19444, 0.10556, 0, 0, 0.30667],
        "45": [0, 0.43056, 0.02826, 0, 0.35778],
        "46": [0, 0.10556, 0, 0, 0.30667],
        "47": [0.25, 0.75, 0.16194, 0, 0.51111],
        "48": [0, 0.64444, 0.13556, 0, 0.51111],
        "49": [0, 0.64444, 0.13556, 0, 0.51111],
        "50": [0, 0.64444, 0.13556, 0, 0.51111],
        "51": [0, 0.64444, 0.13556, 0, 0.51111],
        "52": [0.19444, 0.64444, 0.13556, 0, 0.51111],
        "53": [0, 0.64444, 0.13556, 0, 0.51111],
        "54": [0, 0.64444, 0.13556, 0, 0.51111],
        "55": [0.19444, 0.64444, 0.13556, 0, 0.51111],
        "56": [0, 0.64444, 0.13556, 0, 0.51111],
        "57": [0, 0.64444, 0.13556, 0, 0.51111],
        "58": [0, 0.43056, 0.0582, 0, 0.30667],
        "59": [0.19444, 0.43056, 0.0582, 0, 0.30667],
        "61": [-0.13313, 0.36687, 0.06616, 0, 0.76666],
        "63": [0, 0.69444, 0.1225, 0, 0.51111],
        "64": [0, 0.69444, 0.09597, 0, 0.76666],
        "65": [0, 0.68333, 0, 0, 0.74333],
        "66": [0, 0.68333, 0.10257, 0, 0.70389],
        "67": [0, 0.68333, 0.14528, 0, 0.71555],
        "68": [0, 0.68333, 0.09403, 0, 0.755],
        "69": [0, 0.68333, 0.12028, 0, 0.67833],
        "70": [0, 0.68333, 0.13305, 0, 0.65277],
        "71": [0, 0.68333, 0.08722, 0, 0.77361],
        "72": [0, 0.68333, 0.16389, 0, 0.74333],
        "73": [0, 0.68333, 0.15806, 0, 0.38555],
        "74": [0, 0.68333, 0.14028, 0, 0.525],
        "75": [0, 0.68333, 0.14528, 0, 0.76888],
        "76": [0, 0.68333, 0, 0, 0.62722],
        "77": [0, 0.68333, 0.16389, 0, 0.89666],
        "78": [0, 0.68333, 0.16389, 0, 0.74333],
        "79": [0, 0.68333, 0.09403, 0, 0.76666],
        "80": [0, 0.68333, 0.10257, 0, 0.67833],
        "81": [0.19444, 0.68333, 0.09403, 0, 0.76666],
        "82": [0, 0.68333, 0.03868, 0, 0.72944],
        "83": [0, 0.68333, 0.11972, 0, 0.56222],
        "84": [0, 0.68333, 0.13305, 0, 0.71555],
        "85": [0, 0.68333, 0.16389, 0, 0.74333],
        "86": [0, 0.68333, 0.18361, 0, 0.74333],
        "87": [0, 0.68333, 0.18361, 0, 0.99888],
        "88": [0, 0.68333, 0.15806, 0, 0.74333],
        "89": [0, 0.68333, 0.19383, 0, 0.74333],
        "90": [0, 0.68333, 0.14528, 0, 0.61333],
        "91": [0.25, 0.75, 0.1875, 0, 0.30667],
        "93": [0.25, 0.75, 0.10528, 0, 0.30667],
        "94": [0, 0.69444, 0.06646, 0, 0.51111],
        "95": [0.31, 0.12056, 0.09208, 0, 0.51111],
        "97": [0, 0.43056, 0.07671, 0, 0.51111],
        "98": [0, 0.69444, 0.06312, 0, 0.46],
        "99": [0, 0.43056, 0.05653, 0, 0.46],
        "100": [0, 0.69444, 0.10333, 0, 0.51111],
        "101": [0, 0.43056, 0.07514, 0, 0.46],
        "102": [0.19444, 0.69444, 0.21194, 0, 0.30667],
        "103": [0.19444, 0.43056, 0.08847, 0, 0.46],
        "104": [0, 0.69444, 0.07671, 0, 0.51111],
        "105": [0, 0.65536, 0.1019, 0, 0.30667],
        "106": [0.19444, 0.65536, 0.14467, 0, 0.30667],
        "107": [0, 0.69444, 0.10764, 0, 0.46],
        "108": [0, 0.69444, 0.10333, 0, 0.25555],
        "109": [0, 0.43056, 0.07671, 0, 0.81777],
        "110": [0, 0.43056, 0.07671, 0, 0.56222],
        "111": [0, 0.43056, 0.06312, 0, 0.51111],
        "112": [0.19444, 0.43056, 0.06312, 0, 0.51111],
        "113": [0.19444, 0.43056, 0.08847, 0, 0.46],
        "114": [0, 0.43056, 0.10764, 0, 0.42166],
        "115": [0, 0.43056, 0.08208, 0, 0.40889],
        "116": [0, 0.61508, 0.09486, 0, 0.33222],
        "117": [0, 0.43056, 0.07671, 0, 0.53666],
        "118": [0, 0.43056, 0.10764, 0, 0.46],
        "119": [0, 0.43056, 0.10764, 0, 0.66444],
        "120": [0, 0.43056, 0.12042, 0, 0.46389],
        "121": [0.19444, 0.43056, 0.08847, 0, 0.48555],
        "122": [0, 0.43056, 0.12292, 0, 0.40889],
        "126": [0.35, 0.31786, 0.11585, 0, 0.51111],
        "160": [0, 0, 0, 0, 0.25],
        "168": [0, 0.66786, 0.10474, 0, 0.51111],
        "176": [0, 0.69444, 0, 0, 0.83129],
        "184": [0.17014, 0, 0, 0, 0.46],
        "198": [0, 0.68333, 0.12028, 0, 0.88277],
        "216": [0.04861, 0.73194, 0.09403, 0, 0.76666],
        "223": [0.19444, 0.69444, 0.10514, 0, 0.53666],
        "230": [0, 0.43056, 0.07514, 0, 0.71555],
        "248": [0.09722, 0.52778, 0.09194, 0, 0.51111],
        "338": [0, 0.68333, 0.12028, 0, 0.98499],
        "339": [0, 0.43056, 0.07514, 0, 0.71555],
        "710": [0, 0.69444, 0.06646, 0, 0.51111],
        "711": [0, 0.62847, 0.08295, 0, 0.51111],
        "713": [0, 0.56167, 0.10333, 0, 0.51111],
        "714": [0, 0.69444, 0.09694, 0, 0.51111],
        "715": [0, 0.69444, 0, 0, 0.51111],
        "728": [0, 0.69444, 0.10806, 0, 0.51111],
        "729": [0, 0.66786, 0.11752, 0, 0.30667],
        "730": [0, 0.69444, 0, 0, 0.83129],
        "732": [0, 0.66786, 0.11585, 0, 0.51111],
        "733": [0, 0.69444, 0.1225, 0, 0.51111],
        "915": [0, 0.68333, 0.13305, 0, 0.62722],
        "916": [0, 0.68333, 0, 0, 0.81777],
        "920": [0, 0.68333, 0.09403, 0, 0.76666],
        "923": [0, 0.68333, 0, 0, 0.69222],
        "926": [0, 0.68333, 0.15294, 0, 0.66444],
        "928": [0, 0.68333, 0.16389, 0, 0.74333],
        "931": [0, 0.68333, 0.12028, 0, 0.71555],
        "933": [0, 0.68333, 0.11111, 0, 0.76666],
        "934": [0, 0.68333, 0.05986, 0, 0.71555],
        "936": [0, 0.68333, 0.11111, 0, 0.76666],
        "937": [0, 0.68333, 0.10257, 0, 0.71555],
        "8211": [0, 0.43056, 0.09208, 0, 0.51111],
        "8212": [0, 0.43056, 0.09208, 0, 1.02222],
        "8216": [0, 0.69444, 0.12417, 0, 0.30667],
        "8217": [0, 0.69444, 0.12417, 0, 0.30667],
        "8220": [0, 0.69444, 0.1685, 0, 0.51444],
        "8221": [0, 0.69444, 0.06961, 0, 0.51444],
        "8463": [0, 0.68889, 0, 0, 0.54028]
      },
      "Main-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "33": [0, 0.69444, 0, 0, 0.27778],
        "34": [0, 0.69444, 0, 0, 0.5],
        "35": [0.19444, 0.69444, 0, 0, 0.83334],
        "36": [0.05556, 0.75, 0, 0, 0.5],
        "37": [0.05556, 0.75, 0, 0, 0.83334],
        "38": [0, 0.69444, 0, 0, 0.77778],
        "39": [0, 0.69444, 0, 0, 0.27778],
        "40": [0.25, 0.75, 0, 0, 0.38889],
        "41": [0.25, 0.75, 0, 0, 0.38889],
        "42": [0, 0.75, 0, 0, 0.5],
        "43": [0.08333, 0.58333, 0, 0, 0.77778],
        "44": [0.19444, 0.10556, 0, 0, 0.27778],
        "45": [0, 0.43056, 0, 0, 0.33333],
        "46": [0, 0.10556, 0, 0, 0.27778],
        "47": [0.25, 0.75, 0, 0, 0.5],
        "48": [0, 0.64444, 0, 0, 0.5],
        "49": [0, 0.64444, 0, 0, 0.5],
        "50": [0, 0.64444, 0, 0, 0.5],
        "51": [0, 0.64444, 0, 0, 0.5],
        "52": [0, 0.64444, 0, 0, 0.5],
        "53": [0, 0.64444, 0, 0, 0.5],
        "54": [0, 0.64444, 0, 0, 0.5],
        "55": [0, 0.64444, 0, 0, 0.5],
        "56": [0, 0.64444, 0, 0, 0.5],
        "57": [0, 0.64444, 0, 0, 0.5],
        "58": [0, 0.43056, 0, 0, 0.27778],
        "59": [0.19444, 0.43056, 0, 0, 0.27778],
        "60": [0.0391, 0.5391, 0, 0, 0.77778],
        "61": [-0.13313, 0.36687, 0, 0, 0.77778],
        "62": [0.0391, 0.5391, 0, 0, 0.77778],
        "63": [0, 0.69444, 0, 0, 0.47222],
        "64": [0, 0.69444, 0, 0, 0.77778],
        "65": [0, 0.68333, 0, 0, 0.75],
        "66": [0, 0.68333, 0, 0, 0.70834],
        "67": [0, 0.68333, 0, 0, 0.72222],
        "68": [0, 0.68333, 0, 0, 0.76389],
        "69": [0, 0.68333, 0, 0, 0.68056],
        "70": [0, 0.68333, 0, 0, 0.65278],
        "71": [0, 0.68333, 0, 0, 0.78472],
        "72": [0, 0.68333, 0, 0, 0.75],
        "73": [0, 0.68333, 0, 0, 0.36111],
        "74": [0, 0.68333, 0, 0, 0.51389],
        "75": [0, 0.68333, 0, 0, 0.77778],
        "76": [0, 0.68333, 0, 0, 0.625],
        "77": [0, 0.68333, 0, 0, 0.91667],
        "78": [0, 0.68333, 0, 0, 0.75],
        "79": [0, 0.68333, 0, 0, 0.77778],
        "80": [0, 0.68333, 0, 0, 0.68056],
        "81": [0.19444, 0.68333, 0, 0, 0.77778],
        "82": [0, 0.68333, 0, 0, 0.73611],
        "83": [0, 0.68333, 0, 0, 0.55556],
        "84": [0, 0.68333, 0, 0, 0.72222],
        "85": [0, 0.68333, 0, 0, 0.75],
        "86": [0, 0.68333, 0.01389, 0, 0.75],
        "87": [0, 0.68333, 0.01389, 0, 1.02778],
        "88": [0, 0.68333, 0, 0, 0.75],
        "89": [0, 0.68333, 0.025, 0, 0.75],
        "90": [0, 0.68333, 0, 0, 0.61111],
        "91": [0.25, 0.75, 0, 0, 0.27778],
        "92": [0.25, 0.75, 0, 0, 0.5],
        "93": [0.25, 0.75, 0, 0, 0.27778],
        "94": [0, 0.69444, 0, 0, 0.5],
        "95": [0.31, 0.12056, 0.02778, 0, 0.5],
        "97": [0, 0.43056, 0, 0, 0.5],
        "98": [0, 0.69444, 0, 0, 0.55556],
        "99": [0, 0.43056, 0, 0, 0.44445],
        "100": [0, 0.69444, 0, 0, 0.55556],
        "101": [0, 0.43056, 0, 0, 0.44445],
        "102": [0, 0.69444, 0.07778, 0, 0.30556],
        "103": [0.19444, 0.43056, 0.01389, 0, 0.5],
        "104": [0, 0.69444, 0, 0, 0.55556],
        "105": [0, 0.66786, 0, 0, 0.27778],
        "106": [0.19444, 0.66786, 0, 0, 0.30556],
        "107": [0, 0.69444, 0, 0, 0.52778],
        "108": [0, 0.69444, 0, 0, 0.27778],
        "109": [0, 0.43056, 0, 0, 0.83334],
        "110": [0, 0.43056, 0, 0, 0.55556],
        "111": [0, 0.43056, 0, 0, 0.5],
        "112": [0.19444, 0.43056, 0, 0, 0.55556],
        "113": [0.19444, 0.43056, 0, 0, 0.52778],
        "114": [0, 0.43056, 0, 0, 0.39167],
        "115": [0, 0.43056, 0, 0, 0.39445],
        "116": [0, 0.61508, 0, 0, 0.38889],
        "117": [0, 0.43056, 0, 0, 0.55556],
        "118": [0, 0.43056, 0.01389, 0, 0.52778],
        "119": [0, 0.43056, 0.01389, 0, 0.72222],
        "120": [0, 0.43056, 0, 0, 0.52778],
        "121": [0.19444, 0.43056, 0.01389, 0, 0.52778],
        "122": [0, 0.43056, 0, 0, 0.44445],
        "123": [0.25, 0.75, 0, 0, 0.5],
        "124": [0.25, 0.75, 0, 0, 0.27778],
        "125": [0.25, 0.75, 0, 0, 0.5],
        "126": [0.35, 0.31786, 0, 0, 0.5],
        "160": [0, 0, 0, 0, 0.25],
        "163": [0, 0.69444, 0, 0, 0.76909],
        "167": [0.19444, 0.69444, 0, 0, 0.44445],
        "168": [0, 0.66786, 0, 0, 0.5],
        "172": [0, 0.43056, 0, 0, 0.66667],
        "176": [0, 0.69444, 0, 0, 0.75],
        "177": [0.08333, 0.58333, 0, 0, 0.77778],
        "182": [0.19444, 0.69444, 0, 0, 0.61111],
        "184": [0.17014, 0, 0, 0, 0.44445],
        "198": [0, 0.68333, 0, 0, 0.90278],
        "215": [0.08333, 0.58333, 0, 0, 0.77778],
        "216": [0.04861, 0.73194, 0, 0, 0.77778],
        "223": [0, 0.69444, 0, 0, 0.5],
        "230": [0, 0.43056, 0, 0, 0.72222],
        "247": [0.08333, 0.58333, 0, 0, 0.77778],
        "248": [0.09722, 0.52778, 0, 0, 0.5],
        "305": [0, 0.43056, 0, 0, 0.27778],
        "338": [0, 0.68333, 0, 0, 1.01389],
        "339": [0, 0.43056, 0, 0, 0.77778],
        "567": [0.19444, 0.43056, 0, 0, 0.30556],
        "710": [0, 0.69444, 0, 0, 0.5],
        "711": [0, 0.62847, 0, 0, 0.5],
        "713": [0, 0.56778, 0, 0, 0.5],
        "714": [0, 0.69444, 0, 0, 0.5],
        "715": [0, 0.69444, 0, 0, 0.5],
        "728": [0, 0.69444, 0, 0, 0.5],
        "729": [0, 0.66786, 0, 0, 0.27778],
        "730": [0, 0.69444, 0, 0, 0.75],
        "732": [0, 0.66786, 0, 0, 0.5],
        "733": [0, 0.69444, 0, 0, 0.5],
        "915": [0, 0.68333, 0, 0, 0.625],
        "916": [0, 0.68333, 0, 0, 0.83334],
        "920": [0, 0.68333, 0, 0, 0.77778],
        "923": [0, 0.68333, 0, 0, 0.69445],
        "926": [0, 0.68333, 0, 0, 0.66667],
        "928": [0, 0.68333, 0, 0, 0.75],
        "931": [0, 0.68333, 0, 0, 0.72222],
        "933": [0, 0.68333, 0, 0, 0.77778],
        "934": [0, 0.68333, 0, 0, 0.72222],
        "936": [0, 0.68333, 0, 0, 0.77778],
        "937": [0, 0.68333, 0, 0, 0.72222],
        "8211": [0, 0.43056, 0.02778, 0, 0.5],
        "8212": [0, 0.43056, 0.02778, 0, 1],
        "8216": [0, 0.69444, 0, 0, 0.27778],
        "8217": [0, 0.69444, 0, 0, 0.27778],
        "8220": [0, 0.69444, 0, 0, 0.5],
        "8221": [0, 0.69444, 0, 0, 0.5],
        "8224": [0.19444, 0.69444, 0, 0, 0.44445],
        "8225": [0.19444, 0.69444, 0, 0, 0.44445],
        "8230": [0, 0.123, 0, 0, 1.172],
        "8242": [0, 0.55556, 0, 0, 0.275],
        "8407": [0, 0.71444, 0.15382, 0, 0.5],
        "8463": [0, 0.68889, 0, 0, 0.54028],
        "8465": [0, 0.69444, 0, 0, 0.72222],
        "8467": [0, 0.69444, 0, 0.11111, 0.41667],
        "8472": [0.19444, 0.43056, 0, 0.11111, 0.63646],
        "8476": [0, 0.69444, 0, 0, 0.72222],
        "8501": [0, 0.69444, 0, 0, 0.61111],
        "8592": [-0.13313, 0.36687, 0, 0, 1],
        "8593": [0.19444, 0.69444, 0, 0, 0.5],
        "8594": [-0.13313, 0.36687, 0, 0, 1],
        "8595": [0.19444, 0.69444, 0, 0, 0.5],
        "8596": [-0.13313, 0.36687, 0, 0, 1],
        "8597": [0.25, 0.75, 0, 0, 0.5],
        "8598": [0.19444, 0.69444, 0, 0, 1],
        "8599": [0.19444, 0.69444, 0, 0, 1],
        "8600": [0.19444, 0.69444, 0, 0, 1],
        "8601": [0.19444, 0.69444, 0, 0, 1],
        "8614": [0.011, 0.511, 0, 0, 1],
        "8617": [0.011, 0.511, 0, 0, 1.126],
        "8618": [0.011, 0.511, 0, 0, 1.126],
        "8636": [-0.13313, 0.36687, 0, 0, 1],
        "8637": [-0.13313, 0.36687, 0, 0, 1],
        "8640": [-0.13313, 0.36687, 0, 0, 1],
        "8641": [-0.13313, 0.36687, 0, 0, 1],
        "8652": [0.011, 0.671, 0, 0, 1],
        "8656": [-0.13313, 0.36687, 0, 0, 1],
        "8657": [0.19444, 0.69444, 0, 0, 0.61111],
        "8658": [-0.13313, 0.36687, 0, 0, 1],
        "8659": [0.19444, 0.69444, 0, 0, 0.61111],
        "8660": [-0.13313, 0.36687, 0, 0, 1],
        "8661": [0.25, 0.75, 0, 0, 0.61111],
        "8704": [0, 0.69444, 0, 0, 0.55556],
        "8706": [0, 0.69444, 0.05556, 0.08334, 0.5309],
        "8707": [0, 0.69444, 0, 0, 0.55556],
        "8709": [0.05556, 0.75, 0, 0, 0.5],
        "8711": [0, 0.68333, 0, 0, 0.83334],
        "8712": [0.0391, 0.5391, 0, 0, 0.66667],
        "8715": [0.0391, 0.5391, 0, 0, 0.66667],
        "8722": [0.08333, 0.58333, 0, 0, 0.77778],
        "8723": [0.08333, 0.58333, 0, 0, 0.77778],
        "8725": [0.25, 0.75, 0, 0, 0.5],
        "8726": [0.25, 0.75, 0, 0, 0.5],
        "8727": [-0.03472, 0.46528, 0, 0, 0.5],
        "8728": [-0.05555, 0.44445, 0, 0, 0.5],
        "8729": [-0.05555, 0.44445, 0, 0, 0.5],
        "8730": [0.2, 0.8, 0, 0, 0.83334],
        "8733": [0, 0.43056, 0, 0, 0.77778],
        "8734": [0, 0.43056, 0, 0, 1],
        "8736": [0, 0.69224, 0, 0, 0.72222],
        "8739": [0.25, 0.75, 0, 0, 0.27778],
        "8741": [0.25, 0.75, 0, 0, 0.5],
        "8743": [0, 0.55556, 0, 0, 0.66667],
        "8744": [0, 0.55556, 0, 0, 0.66667],
        "8745": [0, 0.55556, 0, 0, 0.66667],
        "8746": [0, 0.55556, 0, 0, 0.66667],
        "8747": [0.19444, 0.69444, 0.11111, 0, 0.41667],
        "8764": [-0.13313, 0.36687, 0, 0, 0.77778],
        "8768": [0.19444, 0.69444, 0, 0, 0.27778],
        "8771": [-0.03625, 0.46375, 0, 0, 0.77778],
        "8773": [-0.022, 0.589, 0, 0, 0.778],
        "8776": [-0.01688, 0.48312, 0, 0, 0.77778],
        "8781": [-0.03625, 0.46375, 0, 0, 0.77778],
        "8784": [-0.133, 0.673, 0, 0, 0.778],
        "8801": [-0.03625, 0.46375, 0, 0, 0.77778],
        "8804": [0.13597, 0.63597, 0, 0, 0.77778],
        "8805": [0.13597, 0.63597, 0, 0, 0.77778],
        "8810": [0.0391, 0.5391, 0, 0, 1],
        "8811": [0.0391, 0.5391, 0, 0, 1],
        "8826": [0.0391, 0.5391, 0, 0, 0.77778],
        "8827": [0.0391, 0.5391, 0, 0, 0.77778],
        "8834": [0.0391, 0.5391, 0, 0, 0.77778],
        "8835": [0.0391, 0.5391, 0, 0, 0.77778],
        "8838": [0.13597, 0.63597, 0, 0, 0.77778],
        "8839": [0.13597, 0.63597, 0, 0, 0.77778],
        "8846": [0, 0.55556, 0, 0, 0.66667],
        "8849": [0.13597, 0.63597, 0, 0, 0.77778],
        "8850": [0.13597, 0.63597, 0, 0, 0.77778],
        "8851": [0, 0.55556, 0, 0, 0.66667],
        "8852": [0, 0.55556, 0, 0, 0.66667],
        "8853": [0.08333, 0.58333, 0, 0, 0.77778],
        "8854": [0.08333, 0.58333, 0, 0, 0.77778],
        "8855": [0.08333, 0.58333, 0, 0, 0.77778],
        "8856": [0.08333, 0.58333, 0, 0, 0.77778],
        "8857": [0.08333, 0.58333, 0, 0, 0.77778],
        "8866": [0, 0.69444, 0, 0, 0.61111],
        "8867": [0, 0.69444, 0, 0, 0.61111],
        "8868": [0, 0.69444, 0, 0, 0.77778],
        "8869": [0, 0.69444, 0, 0, 0.77778],
        "8872": [0.249, 0.75, 0, 0, 0.867],
        "8900": [-0.05555, 0.44445, 0, 0, 0.5],
        "8901": [-0.05555, 0.44445, 0, 0, 0.27778],
        "8902": [-0.03472, 0.46528, 0, 0, 0.5],
        "8904": [5e-3, 0.505, 0, 0, 0.9],
        "8942": [0.03, 0.903, 0, 0, 0.278],
        "8943": [-0.19, 0.313, 0, 0, 1.172],
        "8945": [-0.1, 0.823, 0, 0, 1.282],
        "8968": [0.25, 0.75, 0, 0, 0.44445],
        "8969": [0.25, 0.75, 0, 0, 0.44445],
        "8970": [0.25, 0.75, 0, 0, 0.44445],
        "8971": [0.25, 0.75, 0, 0, 0.44445],
        "8994": [-0.14236, 0.35764, 0, 0, 1],
        "8995": [-0.14236, 0.35764, 0, 0, 1],
        "9136": [0.244, 0.744, 0, 0, 0.412],
        "9137": [0.244, 0.745, 0, 0, 0.412],
        "9651": [0.19444, 0.69444, 0, 0, 0.88889],
        "9657": [-0.03472, 0.46528, 0, 0, 0.5],
        "9661": [0.19444, 0.69444, 0, 0, 0.88889],
        "9667": [-0.03472, 0.46528, 0, 0, 0.5],
        "9711": [0.19444, 0.69444, 0, 0, 1],
        "9824": [0.12963, 0.69444, 0, 0, 0.77778],
        "9825": [0.12963, 0.69444, 0, 0, 0.77778],
        "9826": [0.12963, 0.69444, 0, 0, 0.77778],
        "9827": [0.12963, 0.69444, 0, 0, 0.77778],
        "9837": [0, 0.75, 0, 0, 0.38889],
        "9838": [0.19444, 0.69444, 0, 0, 0.38889],
        "9839": [0.19444, 0.69444, 0, 0, 0.38889],
        "10216": [0.25, 0.75, 0, 0, 0.38889],
        "10217": [0.25, 0.75, 0, 0, 0.38889],
        "10222": [0.244, 0.744, 0, 0, 0.412],
        "10223": [0.244, 0.745, 0, 0, 0.412],
        "10229": [0.011, 0.511, 0, 0, 1.609],
        "10230": [0.011, 0.511, 0, 0, 1.638],
        "10231": [0.011, 0.511, 0, 0, 1.859],
        "10232": [0.024, 0.525, 0, 0, 1.609],
        "10233": [0.024, 0.525, 0, 0, 1.638],
        "10234": [0.024, 0.525, 0, 0, 1.858],
        "10236": [0.011, 0.511, 0, 0, 1.638],
        "10815": [0, 0.68333, 0, 0, 0.75],
        "10927": [0.13597, 0.63597, 0, 0, 0.77778],
        "10928": [0.13597, 0.63597, 0, 0, 0.77778],
        "57376": [0.19444, 0.69444, 0, 0, 0]
      },
      "Math-BoldItalic": {
        "32": [0, 0, 0, 0, 0.25],
        "48": [0, 0.44444, 0, 0, 0.575],
        "49": [0, 0.44444, 0, 0, 0.575],
        "50": [0, 0.44444, 0, 0, 0.575],
        "51": [0.19444, 0.44444, 0, 0, 0.575],
        "52": [0.19444, 0.44444, 0, 0, 0.575],
        "53": [0.19444, 0.44444, 0, 0, 0.575],
        "54": [0, 0.64444, 0, 0, 0.575],
        "55": [0.19444, 0.44444, 0, 0, 0.575],
        "56": [0, 0.64444, 0, 0, 0.575],
        "57": [0.19444, 0.44444, 0, 0, 0.575],
        "65": [0, 0.68611, 0, 0, 0.86944],
        "66": [0, 0.68611, 0.04835, 0, 0.8664],
        "67": [0, 0.68611, 0.06979, 0, 0.81694],
        "68": [0, 0.68611, 0.03194, 0, 0.93812],
        "69": [0, 0.68611, 0.05451, 0, 0.81007],
        "70": [0, 0.68611, 0.15972, 0, 0.68889],
        "71": [0, 0.68611, 0, 0, 0.88673],
        "72": [0, 0.68611, 0.08229, 0, 0.98229],
        "73": [0, 0.68611, 0.07778, 0, 0.51111],
        "74": [0, 0.68611, 0.10069, 0, 0.63125],
        "75": [0, 0.68611, 0.06979, 0, 0.97118],
        "76": [0, 0.68611, 0, 0, 0.75555],
        "77": [0, 0.68611, 0.11424, 0, 1.14201],
        "78": [0, 0.68611, 0.11424, 0, 0.95034],
        "79": [0, 0.68611, 0.03194, 0, 0.83666],
        "80": [0, 0.68611, 0.15972, 0, 0.72309],
        "81": [0.19444, 0.68611, 0, 0, 0.86861],
        "82": [0, 0.68611, 421e-5, 0, 0.87235],
        "83": [0, 0.68611, 0.05382, 0, 0.69271],
        "84": [0, 0.68611, 0.15972, 0, 0.63663],
        "85": [0, 0.68611, 0.11424, 0, 0.80027],
        "86": [0, 0.68611, 0.25555, 0, 0.67778],
        "87": [0, 0.68611, 0.15972, 0, 1.09305],
        "88": [0, 0.68611, 0.07778, 0, 0.94722],
        "89": [0, 0.68611, 0.25555, 0, 0.67458],
        "90": [0, 0.68611, 0.06979, 0, 0.77257],
        "97": [0, 0.44444, 0, 0, 0.63287],
        "98": [0, 0.69444, 0, 0, 0.52083],
        "99": [0, 0.44444, 0, 0, 0.51342],
        "100": [0, 0.69444, 0, 0, 0.60972],
        "101": [0, 0.44444, 0, 0, 0.55361],
        "102": [0.19444, 0.69444, 0.11042, 0, 0.56806],
        "103": [0.19444, 0.44444, 0.03704, 0, 0.5449],
        "104": [0, 0.69444, 0, 0, 0.66759],
        "105": [0, 0.69326, 0, 0, 0.4048],
        "106": [0.19444, 0.69326, 0.0622, 0, 0.47083],
        "107": [0, 0.69444, 0.01852, 0, 0.6037],
        "108": [0, 0.69444, 88e-4, 0, 0.34815],
        "109": [0, 0.44444, 0, 0, 1.0324],
        "110": [0, 0.44444, 0, 0, 0.71296],
        "111": [0, 0.44444, 0, 0, 0.58472],
        "112": [0.19444, 0.44444, 0, 0, 0.60092],
        "113": [0.19444, 0.44444, 0.03704, 0, 0.54213],
        "114": [0, 0.44444, 0.03194, 0, 0.5287],
        "115": [0, 0.44444, 0, 0, 0.53125],
        "116": [0, 0.63492, 0, 0, 0.41528],
        "117": [0, 0.44444, 0, 0, 0.68102],
        "118": [0, 0.44444, 0.03704, 0, 0.56666],
        "119": [0, 0.44444, 0.02778, 0, 0.83148],
        "120": [0, 0.44444, 0, 0, 0.65903],
        "121": [0.19444, 0.44444, 0.03704, 0, 0.59028],
        "122": [0, 0.44444, 0.04213, 0, 0.55509],
        "160": [0, 0, 0, 0, 0.25],
        "915": [0, 0.68611, 0.15972, 0, 0.65694],
        "916": [0, 0.68611, 0, 0, 0.95833],
        "920": [0, 0.68611, 0.03194, 0, 0.86722],
        "923": [0, 0.68611, 0, 0, 0.80555],
        "926": [0, 0.68611, 0.07458, 0, 0.84125],
        "928": [0, 0.68611, 0.08229, 0, 0.98229],
        "931": [0, 0.68611, 0.05451, 0, 0.88507],
        "933": [0, 0.68611, 0.15972, 0, 0.67083],
        "934": [0, 0.68611, 0, 0, 0.76666],
        "936": [0, 0.68611, 0.11653, 0, 0.71402],
        "937": [0, 0.68611, 0.04835, 0, 0.8789],
        "945": [0, 0.44444, 0, 0, 0.76064],
        "946": [0.19444, 0.69444, 0.03403, 0, 0.65972],
        "947": [0.19444, 0.44444, 0.06389, 0, 0.59003],
        "948": [0, 0.69444, 0.03819, 0, 0.52222],
        "949": [0, 0.44444, 0, 0, 0.52882],
        "950": [0.19444, 0.69444, 0.06215, 0, 0.50833],
        "951": [0.19444, 0.44444, 0.03704, 0, 0.6],
        "952": [0, 0.69444, 0.03194, 0, 0.5618],
        "953": [0, 0.44444, 0, 0, 0.41204],
        "954": [0, 0.44444, 0, 0, 0.66759],
        "955": [0, 0.69444, 0, 0, 0.67083],
        "956": [0.19444, 0.44444, 0, 0, 0.70787],
        "957": [0, 0.44444, 0.06898, 0, 0.57685],
        "958": [0.19444, 0.69444, 0.03021, 0, 0.50833],
        "959": [0, 0.44444, 0, 0, 0.58472],
        "960": [0, 0.44444, 0.03704, 0, 0.68241],
        "961": [0.19444, 0.44444, 0, 0, 0.6118],
        "962": [0.09722, 0.44444, 0.07917, 0, 0.42361],
        "963": [0, 0.44444, 0.03704, 0, 0.68588],
        "964": [0, 0.44444, 0.13472, 0, 0.52083],
        "965": [0, 0.44444, 0.03704, 0, 0.63055],
        "966": [0.19444, 0.44444, 0, 0, 0.74722],
        "967": [0.19444, 0.44444, 0, 0, 0.71805],
        "968": [0.19444, 0.69444, 0.03704, 0, 0.75833],
        "969": [0, 0.44444, 0.03704, 0, 0.71782],
        "977": [0, 0.69444, 0, 0, 0.69155],
        "981": [0.19444, 0.69444, 0, 0, 0.7125],
        "982": [0, 0.44444, 0.03194, 0, 0.975],
        "1009": [0.19444, 0.44444, 0, 0, 0.6118],
        "1013": [0, 0.44444, 0, 0, 0.48333],
        "57649": [0, 0.44444, 0, 0, 0.39352],
        "57911": [0.19444, 0.44444, 0, 0, 0.43889]
      },
      "Math-Italic": {
        "32": [0, 0, 0, 0, 0.25],
        "48": [0, 0.43056, 0, 0, 0.5],
        "49": [0, 0.43056, 0, 0, 0.5],
        "50": [0, 0.43056, 0, 0, 0.5],
        "51": [0.19444, 0.43056, 0, 0, 0.5],
        "52": [0.19444, 0.43056, 0, 0, 0.5],
        "53": [0.19444, 0.43056, 0, 0, 0.5],
        "54": [0, 0.64444, 0, 0, 0.5],
        "55": [0.19444, 0.43056, 0, 0, 0.5],
        "56": [0, 0.64444, 0, 0, 0.5],
        "57": [0.19444, 0.43056, 0, 0, 0.5],
        "65": [0, 0.68333, 0, 0.13889, 0.75],
        "66": [0, 0.68333, 0.05017, 0.08334, 0.75851],
        "67": [0, 0.68333, 0.07153, 0.08334, 0.71472],
        "68": [0, 0.68333, 0.02778, 0.05556, 0.82792],
        "69": [0, 0.68333, 0.05764, 0.08334, 0.7382],
        "70": [0, 0.68333, 0.13889, 0.08334, 0.64306],
        "71": [0, 0.68333, 0, 0.08334, 0.78625],
        "72": [0, 0.68333, 0.08125, 0.05556, 0.83125],
        "73": [0, 0.68333, 0.07847, 0.11111, 0.43958],
        "74": [0, 0.68333, 0.09618, 0.16667, 0.55451],
        "75": [0, 0.68333, 0.07153, 0.05556, 0.84931],
        "76": [0, 0.68333, 0, 0.02778, 0.68056],
        "77": [0, 0.68333, 0.10903, 0.08334, 0.97014],
        "78": [0, 0.68333, 0.10903, 0.08334, 0.80347],
        "79": [0, 0.68333, 0.02778, 0.08334, 0.76278],
        "80": [0, 0.68333, 0.13889, 0.08334, 0.64201],
        "81": [0.19444, 0.68333, 0, 0.08334, 0.79056],
        "82": [0, 0.68333, 773e-5, 0.08334, 0.75929],
        "83": [0, 0.68333, 0.05764, 0.08334, 0.6132],
        "84": [0, 0.68333, 0.13889, 0.08334, 0.58438],
        "85": [0, 0.68333, 0.10903, 0.02778, 0.68278],
        "86": [0, 0.68333, 0.22222, 0, 0.58333],
        "87": [0, 0.68333, 0.13889, 0, 0.94445],
        "88": [0, 0.68333, 0.07847, 0.08334, 0.82847],
        "89": [0, 0.68333, 0.22222, 0, 0.58056],
        "90": [0, 0.68333, 0.07153, 0.08334, 0.68264],
        "97": [0, 0.43056, 0, 0, 0.52859],
        "98": [0, 0.69444, 0, 0, 0.42917],
        "99": [0, 0.43056, 0, 0.05556, 0.43276],
        "100": [0, 0.69444, 0, 0.16667, 0.52049],
        "101": [0, 0.43056, 0, 0.05556, 0.46563],
        "102": [0.19444, 0.69444, 0.10764, 0.16667, 0.48959],
        "103": [0.19444, 0.43056, 0.03588, 0.02778, 0.47697],
        "104": [0, 0.69444, 0, 0, 0.57616],
        "105": [0, 0.65952, 0, 0, 0.34451],
        "106": [0.19444, 0.65952, 0.05724, 0, 0.41181],
        "107": [0, 0.69444, 0.03148, 0, 0.5206],
        "108": [0, 0.69444, 0.01968, 0.08334, 0.29838],
        "109": [0, 0.43056, 0, 0, 0.87801],
        "110": [0, 0.43056, 0, 0, 0.60023],
        "111": [0, 0.43056, 0, 0.05556, 0.48472],
        "112": [0.19444, 0.43056, 0, 0.08334, 0.50313],
        "113": [0.19444, 0.43056, 0.03588, 0.08334, 0.44641],
        "114": [0, 0.43056, 0.02778, 0.05556, 0.45116],
        "115": [0, 0.43056, 0, 0.05556, 0.46875],
        "116": [0, 0.61508, 0, 0.08334, 0.36111],
        "117": [0, 0.43056, 0, 0.02778, 0.57246],
        "118": [0, 0.43056, 0.03588, 0.02778, 0.48472],
        "119": [0, 0.43056, 0.02691, 0.08334, 0.71592],
        "120": [0, 0.43056, 0, 0.02778, 0.57153],
        "121": [0.19444, 0.43056, 0.03588, 0.05556, 0.49028],
        "122": [0, 0.43056, 0.04398, 0.05556, 0.46505],
        "160": [0, 0, 0, 0, 0.25],
        "915": [0, 0.68333, 0.13889, 0.08334, 0.61528],
        "916": [0, 0.68333, 0, 0.16667, 0.83334],
        "920": [0, 0.68333, 0.02778, 0.08334, 0.76278],
        "923": [0, 0.68333, 0, 0.16667, 0.69445],
        "926": [0, 0.68333, 0.07569, 0.08334, 0.74236],
        "928": [0, 0.68333, 0.08125, 0.05556, 0.83125],
        "931": [0, 0.68333, 0.05764, 0.08334, 0.77986],
        "933": [0, 0.68333, 0.13889, 0.05556, 0.58333],
        "934": [0, 0.68333, 0, 0.08334, 0.66667],
        "936": [0, 0.68333, 0.11, 0.05556, 0.61222],
        "937": [0, 0.68333, 0.05017, 0.08334, 0.7724],
        "945": [0, 0.43056, 37e-4, 0.02778, 0.6397],
        "946": [0.19444, 0.69444, 0.05278, 0.08334, 0.56563],
        "947": [0.19444, 0.43056, 0.05556, 0, 0.51773],
        "948": [0, 0.69444, 0.03785, 0.05556, 0.44444],
        "949": [0, 0.43056, 0, 0.08334, 0.46632],
        "950": [0.19444, 0.69444, 0.07378, 0.08334, 0.4375],
        "951": [0.19444, 0.43056, 0.03588, 0.05556, 0.49653],
        "952": [0, 0.69444, 0.02778, 0.08334, 0.46944],
        "953": [0, 0.43056, 0, 0.05556, 0.35394],
        "954": [0, 0.43056, 0, 0, 0.57616],
        "955": [0, 0.69444, 0, 0, 0.58334],
        "956": [0.19444, 0.43056, 0, 0.02778, 0.60255],
        "957": [0, 0.43056, 0.06366, 0.02778, 0.49398],
        "958": [0.19444, 0.69444, 0.04601, 0.11111, 0.4375],
        "959": [0, 0.43056, 0, 0.05556, 0.48472],
        "960": [0, 0.43056, 0.03588, 0, 0.57003],
        "961": [0.19444, 0.43056, 0, 0.08334, 0.51702],
        "962": [0.09722, 0.43056, 0.07986, 0.08334, 0.36285],
        "963": [0, 0.43056, 0.03588, 0, 0.57141],
        "964": [0, 0.43056, 0.1132, 0.02778, 0.43715],
        "965": [0, 0.43056, 0.03588, 0.02778, 0.54028],
        "966": [0.19444, 0.43056, 0, 0.08334, 0.65417],
        "967": [0.19444, 0.43056, 0, 0.05556, 0.62569],
        "968": [0.19444, 0.69444, 0.03588, 0.11111, 0.65139],
        "969": [0, 0.43056, 0.03588, 0, 0.62245],
        "977": [0, 0.69444, 0, 0.08334, 0.59144],
        "981": [0.19444, 0.69444, 0, 0.08334, 0.59583],
        "982": [0, 0.43056, 0.02778, 0, 0.82813],
        "1009": [0.19444, 0.43056, 0, 0.08334, 0.51702],
        "1013": [0, 0.43056, 0, 0.05556, 0.4059],
        "57649": [0, 0.43056, 0, 0.02778, 0.32246],
        "57911": [0.19444, 0.43056, 0, 0.08334, 0.38403]
      },
      "SansSerif-Bold": {
        "32": [0, 0, 0, 0, 0.25],
        "33": [0, 0.69444, 0, 0, 0.36667],
        "34": [0, 0.69444, 0, 0, 0.55834],
        "35": [0.19444, 0.69444, 0, 0, 0.91667],
        "36": [0.05556, 0.75, 0, 0, 0.55],
        "37": [0.05556, 0.75, 0, 0, 1.02912],
        "38": [0, 0.69444, 0, 0, 0.83056],
        "39": [0, 0.69444, 0, 0, 0.30556],
        "40": [0.25, 0.75, 0, 0, 0.42778],
        "41": [0.25, 0.75, 0, 0, 0.42778],
        "42": [0, 0.75, 0, 0, 0.55],
        "43": [0.11667, 0.61667, 0, 0, 0.85556],
        "44": [0.10556, 0.13056, 0, 0, 0.30556],
        "45": [0, 0.45833, 0, 0, 0.36667],
        "46": [0, 0.13056, 0, 0, 0.30556],
        "47": [0.25, 0.75, 0, 0, 0.55],
        "48": [0, 0.69444, 0, 0, 0.55],
        "49": [0, 0.69444, 0, 0, 0.55],
        "50": [0, 0.69444, 0, 0, 0.55],
        "51": [0, 0.69444, 0, 0, 0.55],
        "52": [0, 0.69444, 0, 0, 0.55],
        "53": [0, 0.69444, 0, 0, 0.55],
        "54": [0, 0.69444, 0, 0, 0.55],
        "55": [0, 0.69444, 0, 0, 0.55],
        "56": [0, 0.69444, 0, 0, 0.55],
        "57": [0, 0.69444, 0, 0, 0.55],
        "58": [0, 0.45833, 0, 0, 0.30556],
        "59": [0.10556, 0.45833, 0, 0, 0.30556],
        "61": [-0.09375, 0.40625, 0, 0, 0.85556],
        "63": [0, 0.69444, 0, 0, 0.51945],
        "64": [0, 0.69444, 0, 0, 0.73334],
        "65": [0, 0.69444, 0, 0, 0.73334],
        "66": [0, 0.69444, 0, 0, 0.73334],
        "67": [0, 0.69444, 0, 0, 0.70278],
        "68": [0, 0.69444, 0, 0, 0.79445],
        "69": [0, 0.69444, 0, 0, 0.64167],
        "70": [0, 0.69444, 0, 0, 0.61111],
        "71": [0, 0.69444, 0, 0, 0.73334],
        "72": [0, 0.69444, 0, 0, 0.79445],
        "73": [0, 0.69444, 0, 0, 0.33056],
        "74": [0, 0.69444, 0, 0, 0.51945],
        "75": [0, 0.69444, 0, 0, 0.76389],
        "76": [0, 0.69444, 0, 0, 0.58056],
        "77": [0, 0.69444, 0, 0, 0.97778],
        "78": [0, 0.69444, 0, 0, 0.79445],
        "79": [0, 0.69444, 0, 0, 0.79445],
        "80": [0, 0.69444, 0, 0, 0.70278],
        "81": [0.10556, 0.69444, 0, 0, 0.79445],
        "82": [0, 0.69444, 0, 0, 0.70278],
        "83": [0, 0.69444, 0, 0, 0.61111],
        "84": [0, 0.69444, 0, 0, 0.73334],
        "85": [0, 0.69444, 0, 0, 0.76389],
        "86": [0, 0.69444, 0.01528, 0, 0.73334],
        "87": [0, 0.69444, 0.01528, 0, 1.03889],
        "88": [0, 0.69444, 0, 0, 0.73334],
        "89": [0, 0.69444, 0.0275, 0, 0.73334],
        "90": [0, 0.69444, 0, 0, 0.67223],
        "91": [0.25, 0.75, 0, 0, 0.34306],
        "93": [0.25, 0.75, 0, 0, 0.34306],
        "94": [0, 0.69444, 0, 0, 0.55],
        "95": [0.35, 0.10833, 0.03056, 0, 0.55],
        "97": [0, 0.45833, 0, 0, 0.525],
        "98": [0, 0.69444, 0, 0, 0.56111],
        "99": [0, 0.45833, 0, 0, 0.48889],
        "100": [0, 0.69444, 0, 0, 0.56111],
        "101": [0, 0.45833, 0, 0, 0.51111],
        "102": [0, 0.69444, 0.07639, 0, 0.33611],
        "103": [0.19444, 0.45833, 0.01528, 0, 0.55],
        "104": [0, 0.69444, 0, 0, 0.56111],
        "105": [0, 0.69444, 0, 0, 0.25556],
        "106": [0.19444, 0.69444, 0, 0, 0.28611],
        "107": [0, 0.69444, 0, 0, 0.53056],
        "108": [0, 0.69444, 0, 0, 0.25556],
        "109": [0, 0.45833, 0, 0, 0.86667],
        "110": [0, 0.45833, 0, 0, 0.56111],
        "111": [0, 0.45833, 0, 0, 0.55],
        "112": [0.19444, 0.45833, 0, 0, 0.56111],
        "113": [0.19444, 0.45833, 0, 0, 0.56111],
        "114": [0, 0.45833, 0.01528, 0, 0.37222],
        "115": [0, 0.45833, 0, 0, 0.42167],
        "116": [0, 0.58929, 0, 0, 0.40417],
        "117": [0, 0.45833, 0, 0, 0.56111],
        "118": [0, 0.45833, 0.01528, 0, 0.5],
        "119": [0, 0.45833, 0.01528, 0, 0.74445],
        "120": [0, 0.45833, 0, 0, 0.5],
        "121": [0.19444, 0.45833, 0.01528, 0, 0.5],
        "122": [0, 0.45833, 0, 0, 0.47639],
        "126": [0.35, 0.34444, 0, 0, 0.55],
        "160": [0, 0, 0, 0, 0.25],
        "168": [0, 0.69444, 0, 0, 0.55],
        "176": [0, 0.69444, 0, 0, 0.73334],
        "180": [0, 0.69444, 0, 0, 0.55],
        "184": [0.17014, 0, 0, 0, 0.48889],
        "305": [0, 0.45833, 0, 0, 0.25556],
        "567": [0.19444, 0.45833, 0, 0, 0.28611],
        "710": [0, 0.69444, 0, 0, 0.55],
        "711": [0, 0.63542, 0, 0, 0.55],
        "713": [0, 0.63778, 0, 0, 0.55],
        "728": [0, 0.69444, 0, 0, 0.55],
        "729": [0, 0.69444, 0, 0, 0.30556],
        "730": [0, 0.69444, 0, 0, 0.73334],
        "732": [0, 0.69444, 0, 0, 0.55],
        "733": [0, 0.69444, 0, 0, 0.55],
        "915": [0, 0.69444, 0, 0, 0.58056],
        "916": [0, 0.69444, 0, 0, 0.91667],
        "920": [0, 0.69444, 0, 0, 0.85556],
        "923": [0, 0.69444, 0, 0, 0.67223],
        "926": [0, 0.69444, 0, 0, 0.73334],
        "928": [0, 0.69444, 0, 0, 0.79445],
        "931": [0, 0.69444, 0, 0, 0.79445],
        "933": [0, 0.69444, 0, 0, 0.85556],
        "934": [0, 0.69444, 0, 0, 0.79445],
        "936": [0, 0.69444, 0, 0, 0.85556],
        "937": [0, 0.69444, 0, 0, 0.79445],
        "8211": [0, 0.45833, 0.03056, 0, 0.55],
        "8212": [0, 0.45833, 0.03056, 0, 1.10001],
        "8216": [0, 0.69444, 0, 0, 0.30556],
        "8217": [0, 0.69444, 0, 0, 0.30556],
        "8220": [0, 0.69444, 0, 0, 0.55834],
        "8221": [0, 0.69444, 0, 0, 0.55834]
      },
      "SansSerif-Italic": {
        "32": [0, 0, 0, 0, 0.25],
        "33": [0, 0.69444, 0.05733, 0, 0.31945],
        "34": [0, 0.69444, 316e-5, 0, 0.5],
        "35": [0.19444, 0.69444, 0.05087, 0, 0.83334],
        "36": [0.05556, 0.75, 0.11156, 0, 0.5],
        "37": [0.05556, 0.75, 0.03126, 0, 0.83334],
        "38": [0, 0.69444, 0.03058, 0, 0.75834],
        "39": [0, 0.69444, 0.07816, 0, 0.27778],
        "40": [0.25, 0.75, 0.13164, 0, 0.38889],
        "41": [0.25, 0.75, 0.02536, 0, 0.38889],
        "42": [0, 0.75, 0.11775, 0, 0.5],
        "43": [0.08333, 0.58333, 0.02536, 0, 0.77778],
        "44": [0.125, 0.08333, 0, 0, 0.27778],
        "45": [0, 0.44444, 0.01946, 0, 0.33333],
        "46": [0, 0.08333, 0, 0, 0.27778],
        "47": [0.25, 0.75, 0.13164, 0, 0.5],
        "48": [0, 0.65556, 0.11156, 0, 0.5],
        "49": [0, 0.65556, 0.11156, 0, 0.5],
        "50": [0, 0.65556, 0.11156, 0, 0.5],
        "51": [0, 0.65556, 0.11156, 0, 0.5],
        "52": [0, 0.65556, 0.11156, 0, 0.5],
        "53": [0, 0.65556, 0.11156, 0, 0.5],
        "54": [0, 0.65556, 0.11156, 0, 0.5],
        "55": [0, 0.65556, 0.11156, 0, 0.5],
        "56": [0, 0.65556, 0.11156, 0, 0.5],
        "57": [0, 0.65556, 0.11156, 0, 0.5],
        "58": [0, 0.44444, 0.02502, 0, 0.27778],
        "59": [0.125, 0.44444, 0.02502, 0, 0.27778],
        "61": [-0.13, 0.37, 0.05087, 0, 0.77778],
        "63": [0, 0.69444, 0.11809, 0, 0.47222],
        "64": [0, 0.69444, 0.07555, 0, 0.66667],
        "65": [0, 0.69444, 0, 0, 0.66667],
        "66": [0, 0.69444, 0.08293, 0, 0.66667],
        "67": [0, 0.69444, 0.11983, 0, 0.63889],
        "68": [0, 0.69444, 0.07555, 0, 0.72223],
        "69": [0, 0.69444, 0.11983, 0, 0.59722],
        "70": [0, 0.69444, 0.13372, 0, 0.56945],
        "71": [0, 0.69444, 0.11983, 0, 0.66667],
        "72": [0, 0.69444, 0.08094, 0, 0.70834],
        "73": [0, 0.69444, 0.13372, 0, 0.27778],
        "74": [0, 0.69444, 0.08094, 0, 0.47222],
        "75": [0, 0.69444, 0.11983, 0, 0.69445],
        "76": [0, 0.69444, 0, 0, 0.54167],
        "77": [0, 0.69444, 0.08094, 0, 0.875],
        "78": [0, 0.69444, 0.08094, 0, 0.70834],
        "79": [0, 0.69444, 0.07555, 0, 0.73611],
        "80": [0, 0.69444, 0.08293, 0, 0.63889],
        "81": [0.125, 0.69444, 0.07555, 0, 0.73611],
        "82": [0, 0.69444, 0.08293, 0, 0.64584],
        "83": [0, 0.69444, 0.09205, 0, 0.55556],
        "84": [0, 0.69444, 0.13372, 0, 0.68056],
        "85": [0, 0.69444, 0.08094, 0, 0.6875],
        "86": [0, 0.69444, 0.1615, 0, 0.66667],
        "87": [0, 0.69444, 0.1615, 0, 0.94445],
        "88": [0, 0.69444, 0.13372, 0, 0.66667],
        "89": [0, 0.69444, 0.17261, 0, 0.66667],
        "90": [0, 0.69444, 0.11983, 0, 0.61111],
        "91": [0.25, 0.75, 0.15942, 0, 0.28889],
        "93": [0.25, 0.75, 0.08719, 0, 0.28889],
        "94": [0, 0.69444, 0.0799, 0, 0.5],
        "95": [0.35, 0.09444, 0.08616, 0, 0.5],
        "97": [0, 0.44444, 981e-5, 0, 0.48056],
        "98": [0, 0.69444, 0.03057, 0, 0.51667],
        "99": [0, 0.44444, 0.08336, 0, 0.44445],
        "100": [0, 0.69444, 0.09483, 0, 0.51667],
        "101": [0, 0.44444, 0.06778, 0, 0.44445],
        "102": [0, 0.69444, 0.21705, 0, 0.30556],
        "103": [0.19444, 0.44444, 0.10836, 0, 0.5],
        "104": [0, 0.69444, 0.01778, 0, 0.51667],
        "105": [0, 0.67937, 0.09718, 0, 0.23889],
        "106": [0.19444, 0.67937, 0.09162, 0, 0.26667],
        "107": [0, 0.69444, 0.08336, 0, 0.48889],
        "108": [0, 0.69444, 0.09483, 0, 0.23889],
        "109": [0, 0.44444, 0.01778, 0, 0.79445],
        "110": [0, 0.44444, 0.01778, 0, 0.51667],
        "111": [0, 0.44444, 0.06613, 0, 0.5],
        "112": [0.19444, 0.44444, 0.0389, 0, 0.51667],
        "113": [0.19444, 0.44444, 0.04169, 0, 0.51667],
        "114": [0, 0.44444, 0.10836, 0, 0.34167],
        "115": [0, 0.44444, 0.0778, 0, 0.38333],
        "116": [0, 0.57143, 0.07225, 0, 0.36111],
        "117": [0, 0.44444, 0.04169, 0, 0.51667],
        "118": [0, 0.44444, 0.10836, 0, 0.46111],
        "119": [0, 0.44444, 0.10836, 0, 0.68334],
        "120": [0, 0.44444, 0.09169, 0, 0.46111],
        "121": [0.19444, 0.44444, 0.10836, 0, 0.46111],
        "122": [0, 0.44444, 0.08752, 0, 0.43472],
        "126": [0.35, 0.32659, 0.08826, 0, 0.5],
        "160": [0, 0, 0, 0, 0.25],
        "168": [0, 0.67937, 0.06385, 0, 0.5],
        "176": [0, 0.69444, 0, 0, 0.73752],
        "184": [0.17014, 0, 0, 0, 0.44445],
        "305": [0, 0.44444, 0.04169, 0, 0.23889],
        "567": [0.19444, 0.44444, 0.04169, 0, 0.26667],
        "710": [0, 0.69444, 0.0799, 0, 0.5],
        "711": [0, 0.63194, 0.08432, 0, 0.5],
        "713": [0, 0.60889, 0.08776, 0, 0.5],
        "714": [0, 0.69444, 0.09205, 0, 0.5],
        "715": [0, 0.69444, 0, 0, 0.5],
        "728": [0, 0.69444, 0.09483, 0, 0.5],
        "729": [0, 0.67937, 0.07774, 0, 0.27778],
        "730": [0, 0.69444, 0, 0, 0.73752],
        "732": [0, 0.67659, 0.08826, 0, 0.5],
        "733": [0, 0.69444, 0.09205, 0, 0.5],
        "915": [0, 0.69444, 0.13372, 0, 0.54167],
        "916": [0, 0.69444, 0, 0, 0.83334],
        "920": [0, 0.69444, 0.07555, 0, 0.77778],
        "923": [0, 0.69444, 0, 0, 0.61111],
        "926": [0, 0.69444, 0.12816, 0, 0.66667],
        "928": [0, 0.69444, 0.08094, 0, 0.70834],
        "931": [0, 0.69444, 0.11983, 0, 0.72222],
        "933": [0, 0.69444, 0.09031, 0, 0.77778],
        "934": [0, 0.69444, 0.04603, 0, 0.72222],
        "936": [0, 0.69444, 0.09031, 0, 0.77778],
        "937": [0, 0.69444, 0.08293, 0, 0.72222],
        "8211": [0, 0.44444, 0.08616, 0, 0.5],
        "8212": [0, 0.44444, 0.08616, 0, 1],
        "8216": [0, 0.69444, 0.07816, 0, 0.27778],
        "8217": [0, 0.69444, 0.07816, 0, 0.27778],
        "8220": [0, 0.69444, 0.14205, 0, 0.5],
        "8221": [0, 0.69444, 316e-5, 0, 0.5]
      },
      "SansSerif-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "33": [0, 0.69444, 0, 0, 0.31945],
        "34": [0, 0.69444, 0, 0, 0.5],
        "35": [0.19444, 0.69444, 0, 0, 0.83334],
        "36": [0.05556, 0.75, 0, 0, 0.5],
        "37": [0.05556, 0.75, 0, 0, 0.83334],
        "38": [0, 0.69444, 0, 0, 0.75834],
        "39": [0, 0.69444, 0, 0, 0.27778],
        "40": [0.25, 0.75, 0, 0, 0.38889],
        "41": [0.25, 0.75, 0, 0, 0.38889],
        "42": [0, 0.75, 0, 0, 0.5],
        "43": [0.08333, 0.58333, 0, 0, 0.77778],
        "44": [0.125, 0.08333, 0, 0, 0.27778],
        "45": [0, 0.44444, 0, 0, 0.33333],
        "46": [0, 0.08333, 0, 0, 0.27778],
        "47": [0.25, 0.75, 0, 0, 0.5],
        "48": [0, 0.65556, 0, 0, 0.5],
        "49": [0, 0.65556, 0, 0, 0.5],
        "50": [0, 0.65556, 0, 0, 0.5],
        "51": [0, 0.65556, 0, 0, 0.5],
        "52": [0, 0.65556, 0, 0, 0.5],
        "53": [0, 0.65556, 0, 0, 0.5],
        "54": [0, 0.65556, 0, 0, 0.5],
        "55": [0, 0.65556, 0, 0, 0.5],
        "56": [0, 0.65556, 0, 0, 0.5],
        "57": [0, 0.65556, 0, 0, 0.5],
        "58": [0, 0.44444, 0, 0, 0.27778],
        "59": [0.125, 0.44444, 0, 0, 0.27778],
        "61": [-0.13, 0.37, 0, 0, 0.77778],
        "63": [0, 0.69444, 0, 0, 0.47222],
        "64": [0, 0.69444, 0, 0, 0.66667],
        "65": [0, 0.69444, 0, 0, 0.66667],
        "66": [0, 0.69444, 0, 0, 0.66667],
        "67": [0, 0.69444, 0, 0, 0.63889],
        "68": [0, 0.69444, 0, 0, 0.72223],
        "69": [0, 0.69444, 0, 0, 0.59722],
        "70": [0, 0.69444, 0, 0, 0.56945],
        "71": [0, 0.69444, 0, 0, 0.66667],
        "72": [0, 0.69444, 0, 0, 0.70834],
        "73": [0, 0.69444, 0, 0, 0.27778],
        "74": [0, 0.69444, 0, 0, 0.47222],
        "75": [0, 0.69444, 0, 0, 0.69445],
        "76": [0, 0.69444, 0, 0, 0.54167],
        "77": [0, 0.69444, 0, 0, 0.875],
        "78": [0, 0.69444, 0, 0, 0.70834],
        "79": [0, 0.69444, 0, 0, 0.73611],
        "80": [0, 0.69444, 0, 0, 0.63889],
        "81": [0.125, 0.69444, 0, 0, 0.73611],
        "82": [0, 0.69444, 0, 0, 0.64584],
        "83": [0, 0.69444, 0, 0, 0.55556],
        "84": [0, 0.69444, 0, 0, 0.68056],
        "85": [0, 0.69444, 0, 0, 0.6875],
        "86": [0, 0.69444, 0.01389, 0, 0.66667],
        "87": [0, 0.69444, 0.01389, 0, 0.94445],
        "88": [0, 0.69444, 0, 0, 0.66667],
        "89": [0, 0.69444, 0.025, 0, 0.66667],
        "90": [0, 0.69444, 0, 0, 0.61111],
        "91": [0.25, 0.75, 0, 0, 0.28889],
        "93": [0.25, 0.75, 0, 0, 0.28889],
        "94": [0, 0.69444, 0, 0, 0.5],
        "95": [0.35, 0.09444, 0.02778, 0, 0.5],
        "97": [0, 0.44444, 0, 0, 0.48056],
        "98": [0, 0.69444, 0, 0, 0.51667],
        "99": [0, 0.44444, 0, 0, 0.44445],
        "100": [0, 0.69444, 0, 0, 0.51667],
        "101": [0, 0.44444, 0, 0, 0.44445],
        "102": [0, 0.69444, 0.06944, 0, 0.30556],
        "103": [0.19444, 0.44444, 0.01389, 0, 0.5],
        "104": [0, 0.69444, 0, 0, 0.51667],
        "105": [0, 0.67937, 0, 0, 0.23889],
        "106": [0.19444, 0.67937, 0, 0, 0.26667],
        "107": [0, 0.69444, 0, 0, 0.48889],
        "108": [0, 0.69444, 0, 0, 0.23889],
        "109": [0, 0.44444, 0, 0, 0.79445],
        "110": [0, 0.44444, 0, 0, 0.51667],
        "111": [0, 0.44444, 0, 0, 0.5],
        "112": [0.19444, 0.44444, 0, 0, 0.51667],
        "113": [0.19444, 0.44444, 0, 0, 0.51667],
        "114": [0, 0.44444, 0.01389, 0, 0.34167],
        "115": [0, 0.44444, 0, 0, 0.38333],
        "116": [0, 0.57143, 0, 0, 0.36111],
        "117": [0, 0.44444, 0, 0, 0.51667],
        "118": [0, 0.44444, 0.01389, 0, 0.46111],
        "119": [0, 0.44444, 0.01389, 0, 0.68334],
        "120": [0, 0.44444, 0, 0, 0.46111],
        "121": [0.19444, 0.44444, 0.01389, 0, 0.46111],
        "122": [0, 0.44444, 0, 0, 0.43472],
        "126": [0.35, 0.32659, 0, 0, 0.5],
        "160": [0, 0, 0, 0, 0.25],
        "168": [0, 0.67937, 0, 0, 0.5],
        "176": [0, 0.69444, 0, 0, 0.66667],
        "184": [0.17014, 0, 0, 0, 0.44445],
        "305": [0, 0.44444, 0, 0, 0.23889],
        "567": [0.19444, 0.44444, 0, 0, 0.26667],
        "710": [0, 0.69444, 0, 0, 0.5],
        "711": [0, 0.63194, 0, 0, 0.5],
        "713": [0, 0.60889, 0, 0, 0.5],
        "714": [0, 0.69444, 0, 0, 0.5],
        "715": [0, 0.69444, 0, 0, 0.5],
        "728": [0, 0.69444, 0, 0, 0.5],
        "729": [0, 0.67937, 0, 0, 0.27778],
        "730": [0, 0.69444, 0, 0, 0.66667],
        "732": [0, 0.67659, 0, 0, 0.5],
        "733": [0, 0.69444, 0, 0, 0.5],
        "915": [0, 0.69444, 0, 0, 0.54167],
        "916": [0, 0.69444, 0, 0, 0.83334],
        "920": [0, 0.69444, 0, 0, 0.77778],
        "923": [0, 0.69444, 0, 0, 0.61111],
        "926": [0, 0.69444, 0, 0, 0.66667],
        "928": [0, 0.69444, 0, 0, 0.70834],
        "931": [0, 0.69444, 0, 0, 0.72222],
        "933": [0, 0.69444, 0, 0, 0.77778],
        "934": [0, 0.69444, 0, 0, 0.72222],
        "936": [0, 0.69444, 0, 0, 0.77778],
        "937": [0, 0.69444, 0, 0, 0.72222],
        "8211": [0, 0.44444, 0.02778, 0, 0.5],
        "8212": [0, 0.44444, 0.02778, 0, 1],
        "8216": [0, 0.69444, 0, 0, 0.27778],
        "8217": [0, 0.69444, 0, 0, 0.27778],
        "8220": [0, 0.69444, 0, 0, 0.5],
        "8221": [0, 0.69444, 0, 0, 0.5]
      },
      "Script-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "65": [0, 0.7, 0.22925, 0, 0.80253],
        "66": [0, 0.7, 0.04087, 0, 0.90757],
        "67": [0, 0.7, 0.1689, 0, 0.66619],
        "68": [0, 0.7, 0.09371, 0, 0.77443],
        "69": [0, 0.7, 0.18583, 0, 0.56162],
        "70": [0, 0.7, 0.13634, 0, 0.89544],
        "71": [0, 0.7, 0.17322, 0, 0.60961],
        "72": [0, 0.7, 0.29694, 0, 0.96919],
        "73": [0, 0.7, 0.19189, 0, 0.80907],
        "74": [0.27778, 0.7, 0.19189, 0, 1.05159],
        "75": [0, 0.7, 0.31259, 0, 0.91364],
        "76": [0, 0.7, 0.19189, 0, 0.87373],
        "77": [0, 0.7, 0.15981, 0, 1.08031],
        "78": [0, 0.7, 0.3525, 0, 0.9015],
        "79": [0, 0.7, 0.08078, 0, 0.73787],
        "80": [0, 0.7, 0.08078, 0, 1.01262],
        "81": [0, 0.7, 0.03305, 0, 0.88282],
        "82": [0, 0.7, 0.06259, 0, 0.85],
        "83": [0, 0.7, 0.19189, 0, 0.86767],
        "84": [0, 0.7, 0.29087, 0, 0.74697],
        "85": [0, 0.7, 0.25815, 0, 0.79996],
        "86": [0, 0.7, 0.27523, 0, 0.62204],
        "87": [0, 0.7, 0.27523, 0, 0.80532],
        "88": [0, 0.7, 0.26006, 0, 0.94445],
        "89": [0, 0.7, 0.2939, 0, 0.70961],
        "90": [0, 0.7, 0.24037, 0, 0.8212],
        "160": [0, 0, 0, 0, 0.25]
      },
      "Size1-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "40": [0.35001, 0.85, 0, 0, 0.45834],
        "41": [0.35001, 0.85, 0, 0, 0.45834],
        "47": [0.35001, 0.85, 0, 0, 0.57778],
        "91": [0.35001, 0.85, 0, 0, 0.41667],
        "92": [0.35001, 0.85, 0, 0, 0.57778],
        "93": [0.35001, 0.85, 0, 0, 0.41667],
        "123": [0.35001, 0.85, 0, 0, 0.58334],
        "125": [0.35001, 0.85, 0, 0, 0.58334],
        "160": [0, 0, 0, 0, 0.25],
        "710": [0, 0.72222, 0, 0, 0.55556],
        "732": [0, 0.72222, 0, 0, 0.55556],
        "770": [0, 0.72222, 0, 0, 0.55556],
        "771": [0, 0.72222, 0, 0, 0.55556],
        "8214": [-99e-5, 0.601, 0, 0, 0.77778],
        "8593": [1e-5, 0.6, 0, 0, 0.66667],
        "8595": [1e-5, 0.6, 0, 0, 0.66667],
        "8657": [1e-5, 0.6, 0, 0, 0.77778],
        "8659": [1e-5, 0.6, 0, 0, 0.77778],
        "8719": [0.25001, 0.75, 0, 0, 0.94445],
        "8720": [0.25001, 0.75, 0, 0, 0.94445],
        "8721": [0.25001, 0.75, 0, 0, 1.05556],
        "8730": [0.35001, 0.85, 0, 0, 1],
        "8739": [-599e-5, 0.606, 0, 0, 0.33333],
        "8741": [-599e-5, 0.606, 0, 0, 0.55556],
        "8747": [0.30612, 0.805, 0.19445, 0, 0.47222],
        "8748": [0.306, 0.805, 0.19445, 0, 0.47222],
        "8749": [0.306, 0.805, 0.19445, 0, 0.47222],
        "8750": [0.30612, 0.805, 0.19445, 0, 0.47222],
        "8896": [0.25001, 0.75, 0, 0, 0.83334],
        "8897": [0.25001, 0.75, 0, 0, 0.83334],
        "8898": [0.25001, 0.75, 0, 0, 0.83334],
        "8899": [0.25001, 0.75, 0, 0, 0.83334],
        "8968": [0.35001, 0.85, 0, 0, 0.47222],
        "8969": [0.35001, 0.85, 0, 0, 0.47222],
        "8970": [0.35001, 0.85, 0, 0, 0.47222],
        "8971": [0.35001, 0.85, 0, 0, 0.47222],
        "9168": [-99e-5, 0.601, 0, 0, 0.66667],
        "10216": [0.35001, 0.85, 0, 0, 0.47222],
        "10217": [0.35001, 0.85, 0, 0, 0.47222],
        "10752": [0.25001, 0.75, 0, 0, 1.11111],
        "10753": [0.25001, 0.75, 0, 0, 1.11111],
        "10754": [0.25001, 0.75, 0, 0, 1.11111],
        "10756": [0.25001, 0.75, 0, 0, 0.83334],
        "10758": [0.25001, 0.75, 0, 0, 0.83334]
      },
      "Size2-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "40": [0.65002, 1.15, 0, 0, 0.59722],
        "41": [0.65002, 1.15, 0, 0, 0.59722],
        "47": [0.65002, 1.15, 0, 0, 0.81111],
        "91": [0.65002, 1.15, 0, 0, 0.47222],
        "92": [0.65002, 1.15, 0, 0, 0.81111],
        "93": [0.65002, 1.15, 0, 0, 0.47222],
        "123": [0.65002, 1.15, 0, 0, 0.66667],
        "125": [0.65002, 1.15, 0, 0, 0.66667],
        "160": [0, 0, 0, 0, 0.25],
        "710": [0, 0.75, 0, 0, 1],
        "732": [0, 0.75, 0, 0, 1],
        "770": [0, 0.75, 0, 0, 1],
        "771": [0, 0.75, 0, 0, 1],
        "8719": [0.55001, 1.05, 0, 0, 1.27778],
        "8720": [0.55001, 1.05, 0, 0, 1.27778],
        "8721": [0.55001, 1.05, 0, 0, 1.44445],
        "8730": [0.65002, 1.15, 0, 0, 1],
        "8747": [0.86225, 1.36, 0.44445, 0, 0.55556],
        "8748": [0.862, 1.36, 0.44445, 0, 0.55556],
        "8749": [0.862, 1.36, 0.44445, 0, 0.55556],
        "8750": [0.86225, 1.36, 0.44445, 0, 0.55556],
        "8896": [0.55001, 1.05, 0, 0, 1.11111],
        "8897": [0.55001, 1.05, 0, 0, 1.11111],
        "8898": [0.55001, 1.05, 0, 0, 1.11111],
        "8899": [0.55001, 1.05, 0, 0, 1.11111],
        "8968": [0.65002, 1.15, 0, 0, 0.52778],
        "8969": [0.65002, 1.15, 0, 0, 0.52778],
        "8970": [0.65002, 1.15, 0, 0, 0.52778],
        "8971": [0.65002, 1.15, 0, 0, 0.52778],
        "10216": [0.65002, 1.15, 0, 0, 0.61111],
        "10217": [0.65002, 1.15, 0, 0, 0.61111],
        "10752": [0.55001, 1.05, 0, 0, 1.51112],
        "10753": [0.55001, 1.05, 0, 0, 1.51112],
        "10754": [0.55001, 1.05, 0, 0, 1.51112],
        "10756": [0.55001, 1.05, 0, 0, 1.11111],
        "10758": [0.55001, 1.05, 0, 0, 1.11111]
      },
      "Size3-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "40": [0.95003, 1.45, 0, 0, 0.73611],
        "41": [0.95003, 1.45, 0, 0, 0.73611],
        "47": [0.95003, 1.45, 0, 0, 1.04445],
        "91": [0.95003, 1.45, 0, 0, 0.52778],
        "92": [0.95003, 1.45, 0, 0, 1.04445],
        "93": [0.95003, 1.45, 0, 0, 0.52778],
        "123": [0.95003, 1.45, 0, 0, 0.75],
        "125": [0.95003, 1.45, 0, 0, 0.75],
        "160": [0, 0, 0, 0, 0.25],
        "710": [0, 0.75, 0, 0, 1.44445],
        "732": [0, 0.75, 0, 0, 1.44445],
        "770": [0, 0.75, 0, 0, 1.44445],
        "771": [0, 0.75, 0, 0, 1.44445],
        "8730": [0.95003, 1.45, 0, 0, 1],
        "8968": [0.95003, 1.45, 0, 0, 0.58334],
        "8969": [0.95003, 1.45, 0, 0, 0.58334],
        "8970": [0.95003, 1.45, 0, 0, 0.58334],
        "8971": [0.95003, 1.45, 0, 0, 0.58334],
        "10216": [0.95003, 1.45, 0, 0, 0.75],
        "10217": [0.95003, 1.45, 0, 0, 0.75]
      },
      "Size4-Regular": {
        "32": [0, 0, 0, 0, 0.25],
        "40": [1.25003, 1.75, 0, 0, 0.79167],
        "41": [1.25003, 1.75, 0, 0, 0.79167],
        "47": [1.25003, 1.75, 0, 0, 1.27778],
        "91": [1.25003, 1.75, 0, 0, 0.58334],
        "92": [1.25003, 1.75, 0, 0, 1.27778],
        "93": [1.25003, 1.75, 0, 0, 0.58334],
        "123": [1.25003, 1.75, 0, 0, 0.80556],
        "125": [1.25003, 1.75, 0, 0, 0.80556],
        "160": [0, 0, 0, 0, 0.25],
        "710": [0, 0.825, 0, 0, 1.8889],
        "732": [0, 0.825, 0, 0, 1.8889],
        "770": [0, 0.825, 0, 0, 1.8889],
        "771": [0, 0.825, 0, 0, 1.8889],
        "8730": [1.25003, 1.75, 0, 0, 1],
        "8968": [1.25003, 1.75, 0, 0, 0.63889],
        "8969": [1.25003, 1.75, 0, 0, 0.63889],
        "8970": [1.25003, 1.75, 0, 0, 0.63889],
        "8971": [1.25003, 1.75, 0, 0, 0.63889],
        "9115": [0.64502, 1.155, 0, 0, 0.875],
        "9116": [1e-5, 0.6, 0, 0, 0.875],
        "9117": [0.64502, 1.155, 0, 0, 0.875],
        "9118": [0.64502, 1.155, 0, 0, 0.875],
        "9119": [1e-5, 0.6, 0, 0, 0.875],
        "9120": [0.64502, 1.155, 0, 0, 0.875],
        "9121": [0.64502, 1.155, 0, 0, 0.66667],
        "9122": [-99e-5, 0.601, 0, 0, 0.66667],
        "9123": [0.64502, 1.155, 0, 0, 0.66667],
        "9124": [0.64502, 1.155, 0, 0, 0.66667],
        "9125": [-99e-5, 0.601, 0, 0, 0.66667],
        "9126": [0.64502, 1.155, 0, 0, 0.66667],
        "9127": [1e-5, 0.9, 0, 0, 0.88889],
        "9128": [0.65002, 1.15, 0, 0, 0.88889],
        "9129": [0.90001, 0, 0, 0, 0.88889],
        "9130": [0, 0.3, 0, 0, 0.88889],
        "9131": [1e-5, 0.9, 0, 0, 0.88889],
        "9132": [0.65002, 1.15, 0, 0, 0.88889],
        "9133": [0.90001, 0, 0, 0, 0.88889],
        "9143": [0.88502, 0.915, 0, 0, 1.05556],
        "10216": [1.25003, 1.75, 0, 0, 0.80556],
        "10217": [1.25003, 1.75, 0, 0, 0.80556],
        "57344": [-499e-5, 0.605, 0, 0, 1.05556],
        "57345": [-499e-5, 0.605, 0, 0, 1.05556],
        "57680": [0, 0.12, 0, 0, 0.45],
        "57681": [0, 0.12, 0, 0, 0.45],
        "57682": [0, 0.12, 0, 0, 0.45],
        "57683": [0, 0.12, 0, 0, 0.45]
      },
      "Typewriter-Regular": {
        "32": [0, 0, 0, 0, 0.525],
        "33": [0, 0.61111, 0, 0, 0.525],
        "34": [0, 0.61111, 0, 0, 0.525],
        "35": [0, 0.61111, 0, 0, 0.525],
        "36": [0.08333, 0.69444, 0, 0, 0.525],
        "37": [0.08333, 0.69444, 0, 0, 0.525],
        "38": [0, 0.61111, 0, 0, 0.525],
        "39": [0, 0.61111, 0, 0, 0.525],
        "40": [0.08333, 0.69444, 0, 0, 0.525],
        "41": [0.08333, 0.69444, 0, 0, 0.525],
        "42": [0, 0.52083, 0, 0, 0.525],
        "43": [-0.08056, 0.53055, 0, 0, 0.525],
        "44": [0.13889, 0.125, 0, 0, 0.525],
        "45": [-0.08056, 0.53055, 0, 0, 0.525],
        "46": [0, 0.125, 0, 0, 0.525],
        "47": [0.08333, 0.69444, 0, 0, 0.525],
        "48": [0, 0.61111, 0, 0, 0.525],
        "49": [0, 0.61111, 0, 0, 0.525],
        "50": [0, 0.61111, 0, 0, 0.525],
        "51": [0, 0.61111, 0, 0, 0.525],
        "52": [0, 0.61111, 0, 0, 0.525],
        "53": [0, 0.61111, 0, 0, 0.525],
        "54": [0, 0.61111, 0, 0, 0.525],
        "55": [0, 0.61111, 0, 0, 0.525],
        "56": [0, 0.61111, 0, 0, 0.525],
        "57": [0, 0.61111, 0, 0, 0.525],
        "58": [0, 0.43056, 0, 0, 0.525],
        "59": [0.13889, 0.43056, 0, 0, 0.525],
        "60": [-0.05556, 0.55556, 0, 0, 0.525],
        "61": [-0.19549, 0.41562, 0, 0, 0.525],
        "62": [-0.05556, 0.55556, 0, 0, 0.525],
        "63": [0, 0.61111, 0, 0, 0.525],
        "64": [0, 0.61111, 0, 0, 0.525],
        "65": [0, 0.61111, 0, 0, 0.525],
        "66": [0, 0.61111, 0, 0, 0.525],
        "67": [0, 0.61111, 0, 0, 0.525],
        "68": [0, 0.61111, 0, 0, 0.525],
        "69": [0, 0.61111, 0, 0, 0.525],
        "70": [0, 0.61111, 0, 0, 0.525],
        "71": [0, 0.61111, 0, 0, 0.525],
        "72": [0, 0.61111, 0, 0, 0.525],
        "73": [0, 0.61111, 0, 0, 0.525],
        "74": [0, 0.61111, 0, 0, 0.525],
        "75": [0, 0.61111, 0, 0, 0.525],
        "76": [0, 0.61111, 0, 0, 0.525],
        "77": [0, 0.61111, 0, 0, 0.525],
        "78": [0, 0.61111, 0, 0, 0.525],
        "79": [0, 0.61111, 0, 0, 0.525],
        "80": [0, 0.61111, 0, 0, 0.525],
        "81": [0.13889, 0.61111, 0, 0, 0.525],
        "82": [0, 0.61111, 0, 0, 0.525],
        "83": [0, 0.61111, 0, 0, 0.525],
        "84": [0, 0.61111, 0, 0, 0.525],
        "85": [0, 0.61111, 0, 0, 0.525],
        "86": [0, 0.61111, 0, 0, 0.525],
        "87": [0, 0.61111, 0, 0, 0.525],
        "88": [0, 0.61111, 0, 0, 0.525],
        "89": [0, 0.61111, 0, 0, 0.525],
        "90": [0, 0.61111, 0, 0, 0.525],
        "91": [0.08333, 0.69444, 0, 0, 0.525],
        "92": [0.08333, 0.69444, 0, 0, 0.525],
        "93": [0.08333, 0.69444, 0, 0, 0.525],
        "94": [0, 0.61111, 0, 0, 0.525],
        "95": [0.09514, 0, 0, 0, 0.525],
        "96": [0, 0.61111, 0, 0, 0.525],
        "97": [0, 0.43056, 0, 0, 0.525],
        "98": [0, 0.61111, 0, 0, 0.525],
        "99": [0, 0.43056, 0, 0, 0.525],
        "100": [0, 0.61111, 0, 0, 0.525],
        "101": [0, 0.43056, 0, 0, 0.525],
        "102": [0, 0.61111, 0, 0, 0.525],
        "103": [0.22222, 0.43056, 0, 0, 0.525],
        "104": [0, 0.61111, 0, 0, 0.525],
        "105": [0, 0.61111, 0, 0, 0.525],
        "106": [0.22222, 0.61111, 0, 0, 0.525],
        "107": [0, 0.61111, 0, 0, 0.525],
        "108": [0, 0.61111, 0, 0, 0.525],
        "109": [0, 0.43056, 0, 0, 0.525],
        "110": [0, 0.43056, 0, 0, 0.525],
        "111": [0, 0.43056, 0, 0, 0.525],
        "112": [0.22222, 0.43056, 0, 0, 0.525],
        "113": [0.22222, 0.43056, 0, 0, 0.525],
        "114": [0, 0.43056, 0, 0, 0.525],
        "115": [0, 0.43056, 0, 0, 0.525],
        "116": [0, 0.55358, 0, 0, 0.525],
        "117": [0, 0.43056, 0, 0, 0.525],
        "118": [0, 0.43056, 0, 0, 0.525],
        "119": [0, 0.43056, 0, 0, 0.525],
        "120": [0, 0.43056, 0, 0, 0.525],
        "121": [0.22222, 0.43056, 0, 0, 0.525],
        "122": [0, 0.43056, 0, 0, 0.525],
        "123": [0.08333, 0.69444, 0, 0, 0.525],
        "124": [0.08333, 0.69444, 0, 0, 0.525],
        "125": [0.08333, 0.69444, 0, 0, 0.525],
        "126": [0, 0.61111, 0, 0, 0.525],
        "127": [0, 0.61111, 0, 0, 0.525],
        "160": [0, 0, 0, 0, 0.525],
        "176": [0, 0.61111, 0, 0, 0.525],
        "184": [0.19445, 0, 0, 0, 0.525],
        "305": [0, 0.43056, 0, 0, 0.525],
        "567": [0.22222, 0.43056, 0, 0, 0.525],
        "711": [0, 0.56597, 0, 0, 0.525],
        "713": [0, 0.56555, 0, 0, 0.525],
        "714": [0, 0.61111, 0, 0, 0.525],
        "715": [0, 0.61111, 0, 0, 0.525],
        "728": [0, 0.61111, 0, 0, 0.525],
        "730": [0, 0.61111, 0, 0, 0.525],
        "770": [0, 0.61111, 0, 0, 0.525],
        "771": [0, 0.61111, 0, 0, 0.525],
        "776": [0, 0.61111, 0, 0, 0.525],
        "915": [0, 0.61111, 0, 0, 0.525],
        "916": [0, 0.61111, 0, 0, 0.525],
        "920": [0, 0.61111, 0, 0, 0.525],
        "923": [0, 0.61111, 0, 0, 0.525],
        "926": [0, 0.61111, 0, 0, 0.525],
        "928": [0, 0.61111, 0, 0, 0.525],
        "931": [0, 0.61111, 0, 0, 0.525],
        "933": [0, 0.61111, 0, 0, 0.525],
        "934": [0, 0.61111, 0, 0, 0.525],
        "936": [0, 0.61111, 0, 0, 0.525],
        "937": [0, 0.61111, 0, 0, 0.525],
        "8216": [0, 0.61111, 0, 0, 0.525],
        "8217": [0, 0.61111, 0, 0, 0.525],
        "8242": [0, 0.61111, 0, 0, 0.525],
        "9251": [0.11111, 0.21944, 0, 0, 0.525]
      }
    };
    var sigmasAndXis = {
      slant: [0.25, 0.25, 0.25],
      // sigma1
      space: [0, 0, 0],
      // sigma2
      stretch: [0, 0, 0],
      // sigma3
      shrink: [0, 0, 0],
      // sigma4
      xHeight: [0.431, 0.431, 0.431],
      // sigma5
      quad: [1, 1.171, 1.472],
      // sigma6
      extraSpace: [0, 0, 0],
      // sigma7
      num1: [0.677, 0.732, 0.925],
      // sigma8
      num2: [0.394, 0.384, 0.387],
      // sigma9
      num3: [0.444, 0.471, 0.504],
      // sigma10
      denom1: [0.686, 0.752, 1.025],
      // sigma11
      denom2: [0.345, 0.344, 0.532],
      // sigma12
      sup1: [0.413, 0.503, 0.504],
      // sigma13
      sup2: [0.363, 0.431, 0.404],
      // sigma14
      sup3: [0.289, 0.286, 0.294],
      // sigma15
      sub1: [0.15, 0.143, 0.2],
      // sigma16
      sub2: [0.247, 0.286, 0.4],
      // sigma17
      supDrop: [0.386, 0.353, 0.494],
      // sigma18
      subDrop: [0.05, 0.071, 0.1],
      // sigma19
      delim1: [2.39, 1.7, 1.98],
      // sigma20
      delim2: [1.01, 1.157, 1.42],
      // sigma21
      axisHeight: [0.25, 0.25, 0.25],
      // sigma22
      // These font metrics are extracted from TeX by using tftopl on cmex10.tfm;
      // they correspond to the font parameters of the extension fonts (family 3).
      // See the TeXbook, page 441. In AMSTeX, the extension fonts scale; to
      // match cmex7, we'd use cmex7.tfm values for script and scriptscript
      // values.
      defaultRuleThickness: [0.04, 0.049, 0.049],
      // xi8; cmex7: 0.049
      bigOpSpacing1: [0.111, 0.111, 0.111],
      // xi9
      bigOpSpacing2: [0.166, 0.166, 0.166],
      // xi10
      bigOpSpacing3: [0.2, 0.2, 0.2],
      // xi11
      bigOpSpacing4: [0.6, 0.611, 0.611],
      // xi12; cmex7: 0.611
      bigOpSpacing5: [0.1, 0.143, 0.143],
      // xi13; cmex7: 0.143
      // The \sqrt rule width is taken from the height of the surd character.
      // Since we use the same font at all sizes, this thickness doesn't scale.
      sqrtRuleThickness: [0.04, 0.04, 0.04],
      // This value determines how large a pt is, for metrics which are defined
      // in terms of pts.
      // This value is also used in katex.scss; if you change it make sure the
      // values match.
      ptPerEm: [10, 10, 10],
      // The space between adjacent `|` columns in an array definition. From
      // `\showthe\doublerulesep` in LaTeX. Equals 2.0 / ptPerEm.
      doubleRuleSep: [0.2, 0.2, 0.2],
      // The width of separator lines in {array} environments. From
      // `\showthe\arrayrulewidth` in LaTeX. Equals 0.4 / ptPerEm.
      arrayRuleWidth: [0.04, 0.04, 0.04],
      // Two values from LaTeX source2e:
      fboxsep: [0.3, 0.3, 0.3],
      //        3 pt / ptPerEm
      fboxrule: [0.04, 0.04, 0.04]
      // 0.4 pt / ptPerEm
    };
    var extraCharacterMap = {
      // Latin-1
      "\xC5": "A",
      "\xD0": "D",
      "\xDE": "o",
      "\xE5": "a",
      "\xF0": "d",
      "\xFE": "o",
      // Cyrillic
      "\u0410": "A",
      "\u0411": "B",
      "\u0412": "B",
      "\u0413": "F",
      "\u0414": "A",
      "\u0415": "E",
      "\u0416": "K",
      "\u0417": "3",
      "\u0418": "N",
      "\u0419": "N",
      "\u041A": "K",
      "\u041B": "N",
      "\u041C": "M",
      "\u041D": "H",
      "\u041E": "O",
      "\u041F": "N",
      "\u0420": "P",
      "\u0421": "C",
      "\u0422": "T",
      "\u0423": "y",
      "\u0424": "O",
      "\u0425": "X",
      "\u0426": "U",
      "\u0427": "h",
      "\u0428": "W",
      "\u0429": "W",
      "\u042A": "B",
      "\u042B": "X",
      "\u042C": "B",
      "\u042D": "3",
      "\u042E": "X",
      "\u042F": "R",
      "\u0430": "a",
      "\u0431": "b",
      "\u0432": "a",
      "\u0433": "r",
      "\u0434": "y",
      "\u0435": "e",
      "\u0436": "m",
      "\u0437": "e",
      "\u0438": "n",
      "\u0439": "n",
      "\u043A": "n",
      "\u043B": "n",
      "\u043C": "m",
      "\u043D": "n",
      "\u043E": "o",
      "\u043F": "n",
      "\u0440": "p",
      "\u0441": "c",
      "\u0442": "o",
      "\u0443": "y",
      "\u0444": "b",
      "\u0445": "x",
      "\u0446": "n",
      "\u0447": "n",
      "\u0448": "w",
      "\u0449": "w",
      "\u044A": "a",
      "\u044B": "m",
      "\u044C": "a",
      "\u044D": "e",
      "\u044E": "m",
      "\u044F": "r"
    };
    function setFontMetrics(fontName, metrics) {
      fontMetricsData[fontName] = metrics;
    }
    function getCharacterMetrics(character, font, mode) {
      if (!fontMetricsData[font]) {
        throw new Error("Font metrics not found for font: " + font + ".");
      }
      var ch = character.charCodeAt(0);
      var metrics = fontMetricsData[font][ch];
      if (!metrics && character[0] in extraCharacterMap) {
        ch = extraCharacterMap[character[0]].charCodeAt(0);
        metrics = fontMetricsData[font][ch];
      }
      if (!metrics && mode === "text") {
        if (supportedCodepoint(ch)) {
          metrics = fontMetricsData[font][77];
        }
      }
      if (metrics) {
        return {
          depth: metrics[0],
          height: metrics[1],
          italic: metrics[2],
          skew: metrics[3],
          width: metrics[4]
        };
      }
    }
    var fontMetricsBySizeIndex = {};
    function getGlobalMetrics(size) {
      var sizeIndex;
      if (size >= 5) {
        sizeIndex = 0;
      } else if (size >= 3) {
        sizeIndex = 1;
      } else {
        sizeIndex = 2;
      }
      if (!fontMetricsBySizeIndex[sizeIndex]) {
        var metrics = fontMetricsBySizeIndex[sizeIndex] = {
          cssEmPerMu: sigmasAndXis.quad[sizeIndex] / 18
        };
        for (var key in sigmasAndXis) {
          if (sigmasAndXis.hasOwnProperty(key)) {
            metrics[key] = sigmasAndXis[key][sizeIndex];
          }
        }
      }
      return fontMetricsBySizeIndex[sizeIndex];
    }
    var symbols = {
      "math": {},
      "text": {}
    };
    function defineSymbol(mode, font, group, replace, name2, acceptUnicodeChar) {
      symbols[mode][name2] = {
        font,
        group,
        replace
      };
      if (acceptUnicodeChar && replace) {
        symbols[mode][replace] = symbols[mode][name2];
      }
    }
    var math = "math";
    var text = "text";
    var main = "main";
    var ams = "ams";
    var accent = "accent-token";
    var bin = "bin";
    var close = "close";
    var inner = "inner";
    var mathord = "mathord";
    var op = "op-token";
    var open = "open";
    var punct = "punct";
    var rel = "rel";
    var spacing = "spacing";
    var textord = "textord";
    defineSymbol(math, main, rel, "\u2261", "\\equiv", true);
    defineSymbol(math, main, rel, "\u227A", "\\prec", true);
    defineSymbol(math, main, rel, "\u227B", "\\succ", true);
    defineSymbol(math, main, rel, "\u223C", "\\sim", true);
    defineSymbol(math, main, rel, "\u22A5", "\\perp");
    defineSymbol(math, main, rel, "\u2AAF", "\\preceq", true);
    defineSymbol(math, main, rel, "\u2AB0", "\\succeq", true);
    defineSymbol(math, main, rel, "\u2243", "\\simeq", true);
    defineSymbol(math, main, rel, "\u2223", "\\mid", true);
    defineSymbol(math, main, rel, "\u226A", "\\ll", true);
    defineSymbol(math, main, rel, "\u226B", "\\gg", true);
    defineSymbol(math, main, rel, "\u224D", "\\asymp", true);
    defineSymbol(math, main, rel, "\u2225", "\\parallel");
    defineSymbol(math, main, rel, "\u22C8", "\\bowtie", true);
    defineSymbol(math, main, rel, "\u2323", "\\smile", true);
    defineSymbol(math, main, rel, "\u2291", "\\sqsubseteq", true);
    defineSymbol(math, main, rel, "\u2292", "\\sqsupseteq", true);
    defineSymbol(math, main, rel, "\u2250", "\\doteq", true);
    defineSymbol(math, main, rel, "\u2322", "\\frown", true);
    defineSymbol(math, main, rel, "\u220B", "\\ni", true);
    defineSymbol(math, main, rel, "\u221D", "\\propto", true);
    defineSymbol(math, main, rel, "\u22A2", "\\vdash", true);
    defineSymbol(math, main, rel, "\u22A3", "\\dashv", true);
    defineSymbol(math, main, rel, "\u220B", "\\owns");
    defineSymbol(math, main, punct, ".", "\\ldotp");
    defineSymbol(math, main, punct, "\u22C5", "\\cdotp");
    defineSymbol(math, main, punct, "\u22C5", "\xB7");
    defineSymbol(text, main, textord, "\u22C5", "\xB7");
    defineSymbol(math, main, textord, "#", "\\#");
    defineSymbol(text, main, textord, "#", "\\#");
    defineSymbol(math, main, textord, "&", "\\&");
    defineSymbol(text, main, textord, "&", "\\&");
    defineSymbol(math, main, textord, "\u2135", "\\aleph", true);
    defineSymbol(math, main, textord, "\u2200", "\\forall", true);
    defineSymbol(math, main, textord, "\u210F", "\\hbar", true);
    defineSymbol(math, main, textord, "\u2203", "\\exists", true);
    defineSymbol(math, main, textord, "\u2207", "\\nabla", true);
    defineSymbol(math, main, textord, "\u266D", "\\flat", true);
    defineSymbol(math, main, textord, "\u2113", "\\ell", true);
    defineSymbol(math, main, textord, "\u266E", "\\natural", true);
    defineSymbol(math, main, textord, "\u2663", "\\clubsuit", true);
    defineSymbol(math, main, textord, "\u2118", "\\wp", true);
    defineSymbol(math, main, textord, "\u266F", "\\sharp", true);
    defineSymbol(math, main, textord, "\u2662", "\\diamondsuit", true);
    defineSymbol(math, main, textord, "\u211C", "\\Re", true);
    defineSymbol(math, main, textord, "\u2661", "\\heartsuit", true);
    defineSymbol(math, main, textord, "\u2111", "\\Im", true);
    defineSymbol(math, main, textord, "\u2660", "\\spadesuit", true);
    defineSymbol(math, main, textord, "\xA7", "\\S", true);
    defineSymbol(text, main, textord, "\xA7", "\\S");
    defineSymbol(math, main, textord, "\xB6", "\\P", true);
    defineSymbol(text, main, textord, "\xB6", "\\P");
    defineSymbol(math, main, textord, "\u2020", "\\dag");
    defineSymbol(text, main, textord, "\u2020", "\\dag");
    defineSymbol(text, main, textord, "\u2020", "\\textdagger");
    defineSymbol(math, main, textord, "\u2021", "\\ddag");
    defineSymbol(text, main, textord, "\u2021", "\\ddag");
    defineSymbol(text, main, textord, "\u2021", "\\textdaggerdbl");
    defineSymbol(math, main, close, "\u23B1", "\\rmoustache", true);
    defineSymbol(math, main, open, "\u23B0", "\\lmoustache", true);
    defineSymbol(math, main, close, "\u27EF", "\\rgroup", true);
    defineSymbol(math, main, open, "\u27EE", "\\lgroup", true);
    defineSymbol(math, main, bin, "\u2213", "\\mp", true);
    defineSymbol(math, main, bin, "\u2296", "\\ominus", true);
    defineSymbol(math, main, bin, "\u228E", "\\uplus", true);
    defineSymbol(math, main, bin, "\u2293", "\\sqcap", true);
    defineSymbol(math, main, bin, "\u2217", "\\ast");
    defineSymbol(math, main, bin, "\u2294", "\\sqcup", true);
    defineSymbol(math, main, bin, "\u25EF", "\\bigcirc", true);
    defineSymbol(math, main, bin, "\u2219", "\\bullet", true);
    defineSymbol(math, main, bin, "\u2021", "\\ddagger");
    defineSymbol(math, main, bin, "\u2240", "\\wr", true);
    defineSymbol(math, main, bin, "\u2A3F", "\\amalg");
    defineSymbol(math, main, bin, "&", "\\And");
    defineSymbol(math, main, rel, "\u27F5", "\\longleftarrow", true);
    defineSymbol(math, main, rel, "\u21D0", "\\Leftarrow", true);
    defineSymbol(math, main, rel, "\u27F8", "\\Longleftarrow", true);
    defineSymbol(math, main, rel, "\u27F6", "\\longrightarrow", true);
    defineSymbol(math, main, rel, "\u21D2", "\\Rightarrow", true);
    defineSymbol(math, main, rel, "\u27F9", "\\Longrightarrow", true);
    defineSymbol(math, main, rel, "\u2194", "\\leftrightarrow", true);
    defineSymbol(math, main, rel, "\u27F7", "\\longleftrightarrow", true);
    defineSymbol(math, main, rel, "\u21D4", "\\Leftrightarrow", true);
    defineSymbol(math, main, rel, "\u27FA", "\\Longleftrightarrow", true);
    defineSymbol(math, main, rel, "\u21A6", "\\mapsto", true);
    defineSymbol(math, main, rel, "\u27FC", "\\longmapsto", true);
    defineSymbol(math, main, rel, "\u2197", "\\nearrow", true);
    defineSymbol(math, main, rel, "\u21A9", "\\hookleftarrow", true);
    defineSymbol(math, main, rel, "\u21AA", "\\hookrightarrow", true);
    defineSymbol(math, main, rel, "\u2198", "\\searrow", true);
    defineSymbol(math, main, rel, "\u21BC", "\\leftharpoonup", true);
    defineSymbol(math, main, rel, "\u21C0", "\\rightharpoonup", true);
    defineSymbol(math, main, rel, "\u2199", "\\swarrow", true);
    defineSymbol(math, main, rel, "\u21BD", "\\leftharpoondown", true);
    defineSymbol(math, main, rel, "\u21C1", "\\rightharpoondown", true);
    defineSymbol(math, main, rel, "\u2196", "\\nwarrow", true);
    defineSymbol(math, main, rel, "\u21CC", "\\rightleftharpoons", true);
    defineSymbol(math, ams, rel, "\u226E", "\\nless", true);
    defineSymbol(math, ams, rel, "\uE010", "\\@nleqslant");
    defineSymbol(math, ams, rel, "\uE011", "\\@nleqq");
    defineSymbol(math, ams, rel, "\u2A87", "\\lneq", true);
    defineSymbol(math, ams, rel, "\u2268", "\\lneqq", true);
    defineSymbol(math, ams, rel, "\uE00C", "\\@lvertneqq");
    defineSymbol(math, ams, rel, "\u22E6", "\\lnsim", true);
    defineSymbol(math, ams, rel, "\u2A89", "\\lnapprox", true);
    defineSymbol(math, ams, rel, "\u2280", "\\nprec", true);
    defineSymbol(math, ams, rel, "\u22E0", "\\npreceq", true);
    defineSymbol(math, ams, rel, "\u22E8", "\\precnsim", true);
    defineSymbol(math, ams, rel, "\u2AB9", "\\precnapprox", true);
    defineSymbol(math, ams, rel, "\u2241", "\\nsim", true);
    defineSymbol(math, ams, rel, "\uE006", "\\@nshortmid");
    defineSymbol(math, ams, rel, "\u2224", "\\nmid", true);
    defineSymbol(math, ams, rel, "\u22AC", "\\nvdash", true);
    defineSymbol(math, ams, rel, "\u22AD", "\\nvDash", true);
    defineSymbol(math, ams, rel, "\u22EA", "\\ntriangleleft");
    defineSymbol(math, ams, rel, "\u22EC", "\\ntrianglelefteq", true);
    defineSymbol(math, ams, rel, "\u228A", "\\subsetneq", true);
    defineSymbol(math, ams, rel, "\uE01A", "\\@varsubsetneq");
    defineSymbol(math, ams, rel, "\u2ACB", "\\subsetneqq", true);
    defineSymbol(math, ams, rel, "\uE017", "\\@varsubsetneqq");
    defineSymbol(math, ams, rel, "\u226F", "\\ngtr", true);
    defineSymbol(math, ams, rel, "\uE00F", "\\@ngeqslant");
    defineSymbol(math, ams, rel, "\uE00E", "\\@ngeqq");
    defineSymbol(math, ams, rel, "\u2A88", "\\gneq", true);
    defineSymbol(math, ams, rel, "\u2269", "\\gneqq", true);
    defineSymbol(math, ams, rel, "\uE00D", "\\@gvertneqq");
    defineSymbol(math, ams, rel, "\u22E7", "\\gnsim", true);
    defineSymbol(math, ams, rel, "\u2A8A", "\\gnapprox", true);
    defineSymbol(math, ams, rel, "\u2281", "\\nsucc", true);
    defineSymbol(math, ams, rel, "\u22E1", "\\nsucceq", true);
    defineSymbol(math, ams, rel, "\u22E9", "\\succnsim", true);
    defineSymbol(math, ams, rel, "\u2ABA", "\\succnapprox", true);
    defineSymbol(math, ams, rel, "\u2246", "\\ncong", true);
    defineSymbol(math, ams, rel, "\uE007", "\\@nshortparallel");
    defineSymbol(math, ams, rel, "\u2226", "\\nparallel", true);
    defineSymbol(math, ams, rel, "\u22AF", "\\nVDash", true);
    defineSymbol(math, ams, rel, "\u22EB", "\\ntriangleright");
    defineSymbol(math, ams, rel, "\u22ED", "\\ntrianglerighteq", true);
    defineSymbol(math, ams, rel, "\uE018", "\\@nsupseteqq");
    defineSymbol(math, ams, rel, "\u228B", "\\supsetneq", true);
    defineSymbol(math, ams, rel, "\uE01B", "\\@varsupsetneq");
    defineSymbol(math, ams, rel, "\u2ACC", "\\supsetneqq", true);
    defineSymbol(math, ams, rel, "\uE019", "\\@varsupsetneqq");
    defineSymbol(math, ams, rel, "\u22AE", "\\nVdash", true);
    defineSymbol(math, ams, rel, "\u2AB5", "\\precneqq", true);
    defineSymbol(math, ams, rel, "\u2AB6", "\\succneqq", true);
    defineSymbol(math, ams, rel, "\uE016", "\\@nsubseteqq");
    defineSymbol(math, ams, bin, "\u22B4", "\\unlhd");
    defineSymbol(math, ams, bin, "\u22B5", "\\unrhd");
    defineSymbol(math, ams, rel, "\u219A", "\\nleftarrow", true);
    defineSymbol(math, ams, rel, "\u219B", "\\nrightarrow", true);
    defineSymbol(math, ams, rel, "\u21CD", "\\nLeftarrow", true);
    defineSymbol(math, ams, rel, "\u21CF", "\\nRightarrow", true);
    defineSymbol(math, ams, rel, "\u21AE", "\\nleftrightarrow", true);
    defineSymbol(math, ams, rel, "\u21CE", "\\nLeftrightarrow", true);
    defineSymbol(math, ams, rel, "\u25B3", "\\vartriangle");
    defineSymbol(math, ams, textord, "\u210F", "\\hslash");
    defineSymbol(math, ams, textord, "\u25BD", "\\triangledown");
    defineSymbol(math, ams, textord, "\u25CA", "\\lozenge");
    defineSymbol(math, ams, textord, "\u24C8", "\\circledS");
    defineSymbol(math, ams, textord, "\xAE", "\\circledR");
    defineSymbol(text, ams, textord, "\xAE", "\\circledR");
    defineSymbol(math, ams, textord, "\u2221", "\\measuredangle", true);
    defineSymbol(math, ams, textord, "\u2204", "\\nexists");
    defineSymbol(math, ams, textord, "\u2127", "\\mho");
    defineSymbol(math, ams, textord, "\u2132", "\\Finv", true);
    defineSymbol(math, ams, textord, "\u2141", "\\Game", true);
    defineSymbol(math, ams, textord, "\u2035", "\\backprime");
    defineSymbol(math, ams, textord, "\u25B2", "\\blacktriangle");
    defineSymbol(math, ams, textord, "\u25BC", "\\blacktriangledown");
    defineSymbol(math, ams, textord, "\u25A0", "\\blacksquare");
    defineSymbol(math, ams, textord, "\u29EB", "\\blacklozenge");
    defineSymbol(math, ams, textord, "\u2605", "\\bigstar");
    defineSymbol(math, ams, textord, "\u2222", "\\sphericalangle", true);
    defineSymbol(math, ams, textord, "\u2201", "\\complement", true);
    defineSymbol(math, ams, textord, "\xF0", "\\eth", true);
    defineSymbol(text, main, textord, "\xF0", "\xF0");
    defineSymbol(math, ams, textord, "\u2571", "\\diagup");
    defineSymbol(math, ams, textord, "\u2572", "\\diagdown");
    defineSymbol(math, ams, textord, "\u25A1", "\\square");
    defineSymbol(math, ams, textord, "\u25A1", "\\Box");
    defineSymbol(math, ams, textord, "\u25CA", "\\Diamond");
    defineSymbol(math, ams, textord, "\xA5", "\\yen", true);
    defineSymbol(text, ams, textord, "\xA5", "\\yen", true);
    defineSymbol(math, ams, textord, "\u2713", "\\checkmark", true);
    defineSymbol(text, ams, textord, "\u2713", "\\checkmark");
    defineSymbol(math, ams, textord, "\u2136", "\\beth", true);
    defineSymbol(math, ams, textord, "\u2138", "\\daleth", true);
    defineSymbol(math, ams, textord, "\u2137", "\\gimel", true);
    defineSymbol(math, ams, textord, "\u03DD", "\\digamma", true);
    defineSymbol(math, ams, textord, "\u03F0", "\\varkappa");
    defineSymbol(math, ams, open, "\u250C", "\\@ulcorner", true);
    defineSymbol(math, ams, close, "\u2510", "\\@urcorner", true);
    defineSymbol(math, ams, open, "\u2514", "\\@llcorner", true);
    defineSymbol(math, ams, close, "\u2518", "\\@lrcorner", true);
    defineSymbol(math, ams, rel, "\u2266", "\\leqq", true);
    defineSymbol(math, ams, rel, "\u2A7D", "\\leqslant", true);
    defineSymbol(math, ams, rel, "\u2A95", "\\eqslantless", true);
    defineSymbol(math, ams, rel, "\u2272", "\\lesssim", true);
    defineSymbol(math, ams, rel, "\u2A85", "\\lessapprox", true);
    defineSymbol(math, ams, rel, "\u224A", "\\approxeq", true);
    defineSymbol(math, ams, bin, "\u22D6", "\\lessdot");
    defineSymbol(math, ams, rel, "\u22D8", "\\lll", true);
    defineSymbol(math, ams, rel, "\u2276", "\\lessgtr", true);
    defineSymbol(math, ams, rel, "\u22DA", "\\lesseqgtr", true);
    defineSymbol(math, ams, rel, "\u2A8B", "\\lesseqqgtr", true);
    defineSymbol(math, ams, rel, "\u2251", "\\doteqdot");
    defineSymbol(math, ams, rel, "\u2253", "\\risingdotseq", true);
    defineSymbol(math, ams, rel, "\u2252", "\\fallingdotseq", true);
    defineSymbol(math, ams, rel, "\u223D", "\\backsim", true);
    defineSymbol(math, ams, rel, "\u22CD", "\\backsimeq", true);
    defineSymbol(math, ams, rel, "\u2AC5", "\\subseteqq", true);
    defineSymbol(math, ams, rel, "\u22D0", "\\Subset", true);
    defineSymbol(math, ams, rel, "\u228F", "\\sqsubset", true);
    defineSymbol(math, ams, rel, "\u227C", "\\preccurlyeq", true);
    defineSymbol(math, ams, rel, "\u22DE", "\\curlyeqprec", true);
    defineSymbol(math, ams, rel, "\u227E", "\\precsim", true);
    defineSymbol(math, ams, rel, "\u2AB7", "\\precapprox", true);
    defineSymbol(math, ams, rel, "\u22B2", "\\vartriangleleft");
    defineSymbol(math, ams, rel, "\u22B4", "\\trianglelefteq");
    defineSymbol(math, ams, rel, "\u22A8", "\\vDash", true);
    defineSymbol(math, ams, rel, "\u22AA", "\\Vvdash", true);
    defineSymbol(math, ams, rel, "\u2323", "\\smallsmile");
    defineSymbol(math, ams, rel, "\u2322", "\\smallfrown");
    defineSymbol(math, ams, rel, "\u224F", "\\bumpeq", true);
    defineSymbol(math, ams, rel, "\u224E", "\\Bumpeq", true);
    defineSymbol(math, ams, rel, "\u2267", "\\geqq", true);
    defineSymbol(math, ams, rel, "\u2A7E", "\\geqslant", true);
    defineSymbol(math, ams, rel, "\u2A96", "\\eqslantgtr", true);
    defineSymbol(math, ams, rel, "\u2273", "\\gtrsim", true);
    defineSymbol(math, ams, rel, "\u2A86", "\\gtrapprox", true);
    defineSymbol(math, ams, bin, "\u22D7", "\\gtrdot");
    defineSymbol(math, ams, rel, "\u22D9", "\\ggg", true);
    defineSymbol(math, ams, rel, "\u2277", "\\gtrless", true);
    defineSymbol(math, ams, rel, "\u22DB", "\\gtreqless", true);
    defineSymbol(math, ams, rel, "\u2A8C", "\\gtreqqless", true);
    defineSymbol(math, ams, rel, "\u2256", "\\eqcirc", true);
    defineSymbol(math, ams, rel, "\u2257", "\\circeq", true);
    defineSymbol(math, ams, rel, "\u225C", "\\triangleq", true);
    defineSymbol(math, ams, rel, "\u223C", "\\thicksim");
    defineSymbol(math, ams, rel, "\u2248", "\\thickapprox");
    defineSymbol(math, ams, rel, "\u2AC6", "\\supseteqq", true);
    defineSymbol(math, ams, rel, "\u22D1", "\\Supset", true);
    defineSymbol(math, ams, rel, "\u2290", "\\sqsupset", true);
    defineSymbol(math, ams, rel, "\u227D", "\\succcurlyeq", true);
    defineSymbol(math, ams, rel, "\u22DF", "\\curlyeqsucc", true);
    defineSymbol(math, ams, rel, "\u227F", "\\succsim", true);
    defineSymbol(math, ams, rel, "\u2AB8", "\\succapprox", true);
    defineSymbol(math, ams, rel, "\u22B3", "\\vartriangleright");
    defineSymbol(math, ams, rel, "\u22B5", "\\trianglerighteq");
    defineSymbol(math, ams, rel, "\u22A9", "\\Vdash", true);
    defineSymbol(math, ams, rel, "\u2223", "\\shortmid");
    defineSymbol(math, ams, rel, "\u2225", "\\shortparallel");
    defineSymbol(math, ams, rel, "\u226C", "\\between", true);
    defineSymbol(math, ams, rel, "\u22D4", "\\pitchfork", true);
    defineSymbol(math, ams, rel, "\u221D", "\\varpropto");
    defineSymbol(math, ams, rel, "\u25C0", "\\blacktriangleleft");
    defineSymbol(math, ams, rel, "\u2234", "\\therefore", true);
    defineSymbol(math, ams, rel, "\u220D", "\\backepsilon");
    defineSymbol(math, ams, rel, "\u25B6", "\\blacktriangleright");
    defineSymbol(math, ams, rel, "\u2235", "\\because", true);
    defineSymbol(math, ams, rel, "\u22D8", "\\llless");
    defineSymbol(math, ams, rel, "\u22D9", "\\gggtr");
    defineSymbol(math, ams, bin, "\u22B2", "\\lhd");
    defineSymbol(math, ams, bin, "\u22B3", "\\rhd");
    defineSymbol(math, ams, rel, "\u2242", "\\eqsim", true);
    defineSymbol(math, main, rel, "\u22C8", "\\Join");
    defineSymbol(math, ams, rel, "\u2251", "\\Doteq", true);
    defineSymbol(math, ams, bin, "\u2214", "\\dotplus", true);
    defineSymbol(math, ams, bin, "\u2216", "\\smallsetminus");
    defineSymbol(math, ams, bin, "\u22D2", "\\Cap", true);
    defineSymbol(math, ams, bin, "\u22D3", "\\Cup", true);
    defineSymbol(math, ams, bin, "\u2A5E", "\\doublebarwedge", true);
    defineSymbol(math, ams, bin, "\u229F", "\\boxminus", true);
    defineSymbol(math, ams, bin, "\u229E", "\\boxplus", true);
    defineSymbol(math, ams, bin, "\u22C7", "\\divideontimes", true);
    defineSymbol(math, ams, bin, "\u22C9", "\\ltimes", true);
    defineSymbol(math, ams, bin, "\u22CA", "\\rtimes", true);
    defineSymbol(math, ams, bin, "\u22CB", "\\leftthreetimes", true);
    defineSymbol(math, ams, bin, "\u22CC", "\\rightthreetimes", true);
    defineSymbol(math, ams, bin, "\u22CF", "\\curlywedge", true);
    defineSymbol(math, ams, bin, "\u22CE", "\\curlyvee", true);
    defineSymbol(math, ams, bin, "\u229D", "\\circleddash", true);
    defineSymbol(math, ams, bin, "\u229B", "\\circledast", true);
    defineSymbol(math, ams, bin, "\u22C5", "\\centerdot");
    defineSymbol(math, ams, bin, "\u22BA", "\\intercal", true);
    defineSymbol(math, ams, bin, "\u22D2", "\\doublecap");
    defineSymbol(math, ams, bin, "\u22D3", "\\doublecup");
    defineSymbol(math, ams, bin, "\u22A0", "\\boxtimes", true);
    defineSymbol(math, ams, rel, "\u21E2", "\\dashrightarrow", true);
    defineSymbol(math, ams, rel, "\u21E0", "\\dashleftarrow", true);
    defineSymbol(math, ams, rel, "\u21C7", "\\leftleftarrows", true);
    defineSymbol(math, ams, rel, "\u21C6", "\\leftrightarrows", true);
    defineSymbol(math, ams, rel, "\u21DA", "\\Lleftarrow", true);
    defineSymbol(math, ams, rel, "\u219E", "\\twoheadleftarrow", true);
    defineSymbol(math, ams, rel, "\u21A2", "\\leftarrowtail", true);
    defineSymbol(math, ams, rel, "\u21AB", "\\looparrowleft", true);
    defineSymbol(math, ams, rel, "\u21CB", "\\leftrightharpoons", true);
    defineSymbol(math, ams, rel, "\u21B6", "\\curvearrowleft", true);
    defineSymbol(math, ams, rel, "\u21BA", "\\circlearrowleft", true);
    defineSymbol(math, ams, rel, "\u21B0", "\\Lsh", true);
    defineSymbol(math, ams, rel, "\u21C8", "\\upuparrows", true);
    defineSymbol(math, ams, rel, "\u21BF", "\\upharpoonleft", true);
    defineSymbol(math, ams, rel, "\u21C3", "\\downharpoonleft", true);
    defineSymbol(math, main, rel, "\u22B6", "\\origof", true);
    defineSymbol(math, main, rel, "\u22B7", "\\imageof", true);
    defineSymbol(math, ams, rel, "\u22B8", "\\multimap", true);
    defineSymbol(math, ams, rel, "\u21AD", "\\leftrightsquigarrow", true);
    defineSymbol(math, ams, rel, "\u21C9", "\\rightrightarrows", true);
    defineSymbol(math, ams, rel, "\u21C4", "\\rightleftarrows", true);
    defineSymbol(math, ams, rel, "\u21A0", "\\twoheadrightarrow", true);
    defineSymbol(math, ams, rel, "\u21A3", "\\rightarrowtail", true);
    defineSymbol(math, ams, rel, "\u21AC", "\\looparrowright", true);
    defineSymbol(math, ams, rel, "\u21B7", "\\curvearrowright", true);
    defineSymbol(math, ams, rel, "\u21BB", "\\circlearrowright", true);
    defineSymbol(math, ams, rel, "\u21B1", "\\Rsh", true);
    defineSymbol(math, ams, rel, "\u21CA", "\\downdownarrows", true);
    defineSymbol(math, ams, rel, "\u21BE", "\\upharpoonright", true);
    defineSymbol(math, ams, rel, "\u21C2", "\\downharpoonright", true);
    defineSymbol(math, ams, rel, "\u21DD", "\\rightsquigarrow", true);
    defineSymbol(math, ams, rel, "\u21DD", "\\leadsto");
    defineSymbol(math, ams, rel, "\u21DB", "\\Rrightarrow", true);
    defineSymbol(math, ams, rel, "\u21BE", "\\restriction");
    defineSymbol(math, main, textord, "\u2018", "`");
    defineSymbol(math, main, textord, "$", "\\$");
    defineSymbol(text, main, textord, "$", "\\$");
    defineSymbol(text, main, textord, "$", "\\textdollar");
    defineSymbol(math, main, textord, "%", "\\%");
    defineSymbol(text, main, textord, "%", "\\%");
    defineSymbol(math, main, textord, "_", "\\_");
    defineSymbol(text, main, textord, "_", "\\_");
    defineSymbol(text, main, textord, "_", "\\textunderscore");
    defineSymbol(math, main, textord, "\u2220", "\\angle", true);
    defineSymbol(math, main, textord, "\u221E", "\\infty", true);
    defineSymbol(math, main, textord, "\u2032", "\\prime");
    defineSymbol(math, main, textord, "\u25B3", "\\triangle");
    defineSymbol(math, main, textord, "\u0393", "\\Gamma", true);
    defineSymbol(math, main, textord, "\u0394", "\\Delta", true);
    defineSymbol(math, main, textord, "\u0398", "\\Theta", true);
    defineSymbol(math, main, textord, "\u039B", "\\Lambda", true);
    defineSymbol(math, main, textord, "\u039E", "\\Xi", true);
    defineSymbol(math, main, textord, "\u03A0", "\\Pi", true);
    defineSymbol(math, main, textord, "\u03A3", "\\Sigma", true);
    defineSymbol(math, main, textord, "\u03A5", "\\Upsilon", true);
    defineSymbol(math, main, textord, "\u03A6", "\\Phi", true);
    defineSymbol(math, main, textord, "\u03A8", "\\Psi", true);
    defineSymbol(math, main, textord, "\u03A9", "\\Omega", true);
    defineSymbol(math, main, textord, "A", "\u0391");
    defineSymbol(math, main, textord, "B", "\u0392");
    defineSymbol(math, main, textord, "E", "\u0395");
    defineSymbol(math, main, textord, "Z", "\u0396");
    defineSymbol(math, main, textord, "H", "\u0397");
    defineSymbol(math, main, textord, "I", "\u0399");
    defineSymbol(math, main, textord, "K", "\u039A");
    defineSymbol(math, main, textord, "M", "\u039C");
    defineSymbol(math, main, textord, "N", "\u039D");
    defineSymbol(math, main, textord, "O", "\u039F");
    defineSymbol(math, main, textord, "P", "\u03A1");
    defineSymbol(math, main, textord, "T", "\u03A4");
    defineSymbol(math, main, textord, "X", "\u03A7");
    defineSymbol(math, main, textord, "\xAC", "\\neg", true);
    defineSymbol(math, main, textord, "\xAC", "\\lnot");
    defineSymbol(math, main, textord, "\u22A4", "\\top");
    defineSymbol(math, main, textord, "\u22A5", "\\bot");
    defineSymbol(math, main, textord, "\u2205", "\\emptyset");
    defineSymbol(math, ams, textord, "\u2205", "\\varnothing");
    defineSymbol(math, main, mathord, "\u03B1", "\\alpha", true);
    defineSymbol(math, main, mathord, "\u03B2", "\\beta", true);
    defineSymbol(math, main, mathord, "\u03B3", "\\gamma", true);
    defineSymbol(math, main, mathord, "\u03B4", "\\delta", true);
    defineSymbol(math, main, mathord, "\u03F5", "\\epsilon", true);
    defineSymbol(math, main, mathord, "\u03B6", "\\zeta", true);
    defineSymbol(math, main, mathord, "\u03B7", "\\eta", true);
    defineSymbol(math, main, mathord, "\u03B8", "\\theta", true);
    defineSymbol(math, main, mathord, "\u03B9", "\\iota", true);
    defineSymbol(math, main, mathord, "\u03BA", "\\kappa", true);
    defineSymbol(math, main, mathord, "\u03BB", "\\lambda", true);
    defineSymbol(math, main, mathord, "\u03BC", "\\mu", true);
    defineSymbol(math, main, mathord, "\u03BD", "\\nu", true);
    defineSymbol(math, main, mathord, "\u03BE", "\\xi", true);
    defineSymbol(math, main, mathord, "\u03BF", "\\omicron", true);
    defineSymbol(math, main, mathord, "\u03C0", "\\pi", true);
    defineSymbol(math, main, mathord, "\u03C1", "\\rho", true);
    defineSymbol(math, main, mathord, "\u03C3", "\\sigma", true);
    defineSymbol(math, main, mathord, "\u03C4", "\\tau", true);
    defineSymbol(math, main, mathord, "\u03C5", "\\upsilon", true);
    defineSymbol(math, main, mathord, "\u03D5", "\\phi", true);
    defineSymbol(math, main, mathord, "\u03C7", "\\chi", true);
    defineSymbol(math, main, mathord, "\u03C8", "\\psi", true);
    defineSymbol(math, main, mathord, "\u03C9", "\\omega", true);
    defineSymbol(math, main, mathord, "\u03B5", "\\varepsilon", true);
    defineSymbol(math, main, mathord, "\u03D1", "\\vartheta", true);
    defineSymbol(math, main, mathord, "\u03D6", "\\varpi", true);
    defineSymbol(math, main, mathord, "\u03F1", "\\varrho", true);
    defineSymbol(math, main, mathord, "\u03C2", "\\varsigma", true);
    defineSymbol(math, main, mathord, "\u03C6", "\\varphi", true);
    defineSymbol(math, main, bin, "\u2217", "*", true);
    defineSymbol(math, main, bin, "+", "+");
    defineSymbol(math, main, bin, "\u2212", "-", true);
    defineSymbol(math, main, bin, "\u22C5", "\\cdot", true);
    defineSymbol(math, main, bin, "\u2218", "\\circ", true);
    defineSymbol(math, main, bin, "\xF7", "\\div", true);
    defineSymbol(math, main, bin, "\xB1", "\\pm", true);
    defineSymbol(math, main, bin, "\xD7", "\\times", true);
    defineSymbol(math, main, bin, "\u2229", "\\cap", true);
    defineSymbol(math, main, bin, "\u222A", "\\cup", true);
    defineSymbol(math, main, bin, "\u2216", "\\setminus", true);
    defineSymbol(math, main, bin, "\u2227", "\\land");
    defineSymbol(math, main, bin, "\u2228", "\\lor");
    defineSymbol(math, main, bin, "\u2227", "\\wedge", true);
    defineSymbol(math, main, bin, "\u2228", "\\vee", true);
    defineSymbol(math, main, textord, "\u221A", "\\surd");
    defineSymbol(math, main, open, "\u27E8", "\\langle", true);
    defineSymbol(math, main, open, "\u2223", "\\lvert");
    defineSymbol(math, main, open, "\u2225", "\\lVert");
    defineSymbol(math, main, close, "?", "?");
    defineSymbol(math, main, close, "!", "!");
    defineSymbol(math, main, close, "\u27E9", "\\rangle", true);
    defineSymbol(math, main, close, "\u2223", "\\rvert");
    defineSymbol(math, main, close, "\u2225", "\\rVert");
    defineSymbol(math, main, rel, "=", "=");
    defineSymbol(math, main, rel, ":", ":");
    defineSymbol(math, main, rel, "\u2248", "\\approx", true);
    defineSymbol(math, main, rel, "\u2245", "\\cong", true);
    defineSymbol(math, main, rel, "\u2265", "\\ge");
    defineSymbol(math, main, rel, "\u2265", "\\geq", true);
    defineSymbol(math, main, rel, "\u2190", "\\gets");
    defineSymbol(math, main, rel, ">", "\\gt", true);
    defineSymbol(math, main, rel, "\u2208", "\\in", true);
    defineSymbol(math, main, rel, "\uE020", "\\@not");
    defineSymbol(math, main, rel, "\u2282", "\\subset", true);
    defineSymbol(math, main, rel, "\u2283", "\\supset", true);
    defineSymbol(math, main, rel, "\u2286", "\\subseteq", true);
    defineSymbol(math, main, rel, "\u2287", "\\supseteq", true);
    defineSymbol(math, ams, rel, "\u2288", "\\nsubseteq", true);
    defineSymbol(math, ams, rel, "\u2289", "\\nsupseteq", true);
    defineSymbol(math, main, rel, "\u22A8", "\\models");
    defineSymbol(math, main, rel, "\u2190", "\\leftarrow", true);
    defineSymbol(math, main, rel, "\u2264", "\\le");
    defineSymbol(math, main, rel, "\u2264", "\\leq", true);
    defineSymbol(math, main, rel, "<", "\\lt", true);
    defineSymbol(math, main, rel, "\u2192", "\\rightarrow", true);
    defineSymbol(math, main, rel, "\u2192", "\\to");
    defineSymbol(math, ams, rel, "\u2271", "\\ngeq", true);
    defineSymbol(math, ams, rel, "\u2270", "\\nleq", true);
    defineSymbol(math, main, spacing, "\xA0", "\\ ");
    defineSymbol(math, main, spacing, "\xA0", "\\space");
    defineSymbol(math, main, spacing, "\xA0", "\\nobreakspace");
    defineSymbol(text, main, spacing, "\xA0", "\\ ");
    defineSymbol(text, main, spacing, "\xA0", " ");
    defineSymbol(text, main, spacing, "\xA0", "\\space");
    defineSymbol(text, main, spacing, "\xA0", "\\nobreakspace");
    defineSymbol(math, main, spacing, "", "\\nobreak");
    defineSymbol(math, main, spacing, "", "\\allowbreak");
    defineSymbol(math, main, punct, ",", ",");
    defineSymbol(math, main, punct, ";", ";");
    defineSymbol(math, ams, bin, "\u22BC", "\\barwedge", true);
    defineSymbol(math, ams, bin, "\u22BB", "\\veebar", true);
    defineSymbol(math, main, bin, "\u2299", "\\odot", true);
    defineSymbol(math, main, bin, "\u2295", "\\oplus", true);
    defineSymbol(math, main, bin, "\u2297", "\\otimes", true);
    defineSymbol(math, main, textord, "\u2202", "\\partial", true);
    defineSymbol(math, main, bin, "\u2298", "\\oslash", true);
    defineSymbol(math, ams, bin, "\u229A", "\\circledcirc", true);
    defineSymbol(math, ams, bin, "\u22A1", "\\boxdot", true);
    defineSymbol(math, main, bin, "\u25B3", "\\bigtriangleup");
    defineSymbol(math, main, bin, "\u25BD", "\\bigtriangledown");
    defineSymbol(math, main, bin, "\u2020", "\\dagger");
    defineSymbol(math, main, bin, "\u22C4", "\\diamond");
    defineSymbol(math, main, bin, "\u22C6", "\\star");
    defineSymbol(math, main, bin, "\u25C3", "\\triangleleft");
    defineSymbol(math, main, bin, "\u25B9", "\\triangleright");
    defineSymbol(math, main, open, "{", "\\{");
    defineSymbol(text, main, textord, "{", "\\{");
    defineSymbol(text, main, textord, "{", "\\textbraceleft");
    defineSymbol(math, main, close, "}", "\\}");
    defineSymbol(text, main, textord, "}", "\\}");
    defineSymbol(text, main, textord, "}", "\\textbraceright");
    defineSymbol(math, main, open, "{", "\\lbrace");
    defineSymbol(math, main, close, "}", "\\rbrace");
    defineSymbol(math, main, open, "[", "\\lbrack", true);
    defineSymbol(text, main, textord, "[", "\\lbrack", true);
    defineSymbol(math, main, close, "]", "\\rbrack", true);
    defineSymbol(text, main, textord, "]", "\\rbrack", true);
    defineSymbol(math, main, open, "(", "\\lparen", true);
    defineSymbol(math, main, close, ")", "\\rparen", true);
    defineSymbol(text, main, textord, "<", "\\textless", true);
    defineSymbol(text, main, textord, ">", "\\textgreater", true);
    defineSymbol(math, main, open, "\u230A", "\\lfloor", true);
    defineSymbol(math, main, close, "\u230B", "\\rfloor", true);
    defineSymbol(math, main, open, "\u2308", "\\lceil", true);
    defineSymbol(math, main, close, "\u2309", "\\rceil", true);
    defineSymbol(math, main, textord, "\\", "\\backslash");
    defineSymbol(math, main, textord, "\u2223", "|");
    defineSymbol(math, main, textord, "\u2223", "\\vert");
    defineSymbol(text, main, textord, "|", "\\textbar", true);
    defineSymbol(math, main, textord, "\u2225", "\\|");
    defineSymbol(math, main, textord, "\u2225", "\\Vert");
    defineSymbol(text, main, textord, "\u2225", "\\textbardbl");
    defineSymbol(text, main, textord, "~", "\\textasciitilde");
    defineSymbol(text, main, textord, "\\", "\\textbackslash");
    defineSymbol(text, main, textord, "^", "\\textasciicircum");
    defineSymbol(math, main, rel, "\u2191", "\\uparrow", true);
    defineSymbol(math, main, rel, "\u21D1", "\\Uparrow", true);
    defineSymbol(math, main, rel, "\u2193", "\\downarrow", true);
    defineSymbol(math, main, rel, "\u21D3", "\\Downarrow", true);
    defineSymbol(math, main, rel, "\u2195", "\\updownarrow", true);
    defineSymbol(math, main, rel, "\u21D5", "\\Updownarrow", true);
    defineSymbol(math, main, op, "\u2210", "\\coprod");
    defineSymbol(math, main, op, "\u22C1", "\\bigvee");
    defineSymbol(math, main, op, "\u22C0", "\\bigwedge");
    defineSymbol(math, main, op, "\u2A04", "\\biguplus");
    defineSymbol(math, main, op, "\u22C2", "\\bigcap");
    defineSymbol(math, main, op, "\u22C3", "\\bigcup");
    defineSymbol(math, main, op, "\u222B", "\\int");
    defineSymbol(math, main, op, "\u222B", "\\intop");
    defineSymbol(math, main, op, "\u222C", "\\iint");
    defineSymbol(math, main, op, "\u222D", "\\iiint");
    defineSymbol(math, main, op, "\u220F", "\\prod");
    defineSymbol(math, main, op, "\u2211", "\\sum");
    defineSymbol(math, main, op, "\u2A02", "\\bigotimes");
    defineSymbol(math, main, op, "\u2A01", "\\bigoplus");
    defineSymbol(math, main, op, "\u2A00", "\\bigodot");
    defineSymbol(math, main, op, "\u222E", "\\oint");
    defineSymbol(math, main, op, "\u222F", "\\oiint");
    defineSymbol(math, main, op, "\u2230", "\\oiiint");
    defineSymbol(math, main, op, "\u2A06", "\\bigsqcup");
    defineSymbol(math, main, op, "\u222B", "\\smallint");
    defineSymbol(text, main, inner, "\u2026", "\\textellipsis");
    defineSymbol(math, main, inner, "\u2026", "\\mathellipsis");
    defineSymbol(text, main, inner, "\u2026", "\\ldots", true);
    defineSymbol(math, main, inner, "\u2026", "\\ldots", true);
    defineSymbol(math, main, inner, "\u22EF", "\\@cdots", true);
    defineSymbol(math, main, inner, "\u22F1", "\\ddots", true);
    defineSymbol(math, main, textord, "\u22EE", "\\varvdots");
    defineSymbol(text, main, textord, "\u22EE", "\\varvdots");
    defineSymbol(math, main, accent, "\u02CA", "\\acute");
    defineSymbol(math, main, accent, "\u02CB", "\\grave");
    defineSymbol(math, main, accent, "\xA8", "\\ddot");
    defineSymbol(math, main, accent, "~", "\\tilde");
    defineSymbol(math, main, accent, "\u02C9", "\\bar");
    defineSymbol(math, main, accent, "\u02D8", "\\breve");
    defineSymbol(math, main, accent, "\u02C7", "\\check");
    defineSymbol(math, main, accent, "^", "\\hat");
    defineSymbol(math, main, accent, "\u20D7", "\\vec");
    defineSymbol(math, main, accent, "\u02D9", "\\dot");
    defineSymbol(math, main, accent, "\u02DA", "\\mathring");
    defineSymbol(math, main, mathord, "\uE131", "\\@imath");
    defineSymbol(math, main, mathord, "\uE237", "\\@jmath");
    defineSymbol(math, main, textord, "\u0131", "\u0131");
    defineSymbol(math, main, textord, "\u0237", "\u0237");
    defineSymbol(text, main, textord, "\u0131", "\\i", true);
    defineSymbol(text, main, textord, "\u0237", "\\j", true);
    defineSymbol(text, main, textord, "\xDF", "\\ss", true);
    defineSymbol(text, main, textord, "\xE6", "\\ae", true);
    defineSymbol(text, main, textord, "\u0153", "\\oe", true);
    defineSymbol(text, main, textord, "\xF8", "\\o", true);
    defineSymbol(text, main, textord, "\xC6", "\\AE", true);
    defineSymbol(text, main, textord, "\u0152", "\\OE", true);
    defineSymbol(text, main, textord, "\xD8", "\\O", true);
    defineSymbol(text, main, accent, "\u02CA", "\\'");
    defineSymbol(text, main, accent, "\u02CB", "\\`");
    defineSymbol(text, main, accent, "\u02C6", "\\^");
    defineSymbol(text, main, accent, "\u02DC", "\\~");
    defineSymbol(text, main, accent, "\u02C9", "\\=");
    defineSymbol(text, main, accent, "\u02D8", "\\u");
    defineSymbol(text, main, accent, "\u02D9", "\\.");
    defineSymbol(text, main, accent, "\xB8", "\\c");
    defineSymbol(text, main, accent, "\u02DA", "\\r");
    defineSymbol(text, main, accent, "\u02C7", "\\v");
    defineSymbol(text, main, accent, "\xA8", '\\"');
    defineSymbol(text, main, accent, "\u02DD", "\\H");
    defineSymbol(text, main, accent, "\u25EF", "\\textcircled");
    var ligatures = {
      "--": true,
      "---": true,
      "``": true,
      "''": true
    };
    defineSymbol(text, main, textord, "\u2013", "--", true);
    defineSymbol(text, main, textord, "\u2013", "\\textendash");
    defineSymbol(text, main, textord, "\u2014", "---", true);
    defineSymbol(text, main, textord, "\u2014", "\\textemdash");
    defineSymbol(text, main, textord, "\u2018", "`", true);
    defineSymbol(text, main, textord, "\u2018", "\\textquoteleft");
    defineSymbol(text, main, textord, "\u2019", "'", true);
    defineSymbol(text, main, textord, "\u2019", "\\textquoteright");
    defineSymbol(text, main, textord, "\u201C", "``", true);
    defineSymbol(text, main, textord, "\u201C", "\\textquotedblleft");
    defineSymbol(text, main, textord, "\u201D", "''", true);
    defineSymbol(text, main, textord, "\u201D", "\\textquotedblright");
    defineSymbol(math, main, textord, "\xB0", "\\degree", true);
    defineSymbol(text, main, textord, "\xB0", "\\degree");
    defineSymbol(text, main, textord, "\xB0", "\\textdegree", true);
    defineSymbol(math, main, textord, "\xA3", "\\pounds");
    defineSymbol(math, main, textord, "\xA3", "\\mathsterling", true);
    defineSymbol(text, main, textord, "\xA3", "\\pounds");
    defineSymbol(text, main, textord, "\xA3", "\\textsterling", true);
    defineSymbol(math, ams, textord, "\u2720", "\\maltese");
    defineSymbol(text, ams, textord, "\u2720", "\\maltese");
    var mathTextSymbols = '0123456789/@."';
    for (i = 0; i < mathTextSymbols.length; i++) {
      ch = mathTextSymbols.charAt(i);
      defineSymbol(math, main, textord, ch, ch);
    }
    var ch;
    var i;
    var textSymbols = '0123456789!@*()-=+";:?/.,';
    for (_i = 0; _i < textSymbols.length; _i++) {
      _ch = textSymbols.charAt(_i);
      defineSymbol(text, main, textord, _ch, _ch);
    }
    var _ch;
    var _i;
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for (_i2 = 0; _i2 < letters.length; _i2++) {
      _ch2 = letters.charAt(_i2);
      defineSymbol(math, main, mathord, _ch2, _ch2);
      defineSymbol(text, main, textord, _ch2, _ch2);
    }
    var _ch2;
    var _i2;
    defineSymbol(math, ams, textord, "C", "\u2102");
    defineSymbol(text, ams, textord, "C", "\u2102");
    defineSymbol(math, ams, textord, "H", "\u210D");
    defineSymbol(text, ams, textord, "H", "\u210D");
    defineSymbol(math, ams, textord, "N", "\u2115");
    defineSymbol(text, ams, textord, "N", "\u2115");
    defineSymbol(math, ams, textord, "P", "\u2119");
    defineSymbol(text, ams, textord, "P", "\u2119");
    defineSymbol(math, ams, textord, "Q", "\u211A");
    defineSymbol(text, ams, textord, "Q", "\u211A");
    defineSymbol(math, ams, textord, "R", "\u211D");
    defineSymbol(text, ams, textord, "R", "\u211D");
    defineSymbol(math, ams, textord, "Z", "\u2124");
    defineSymbol(text, ams, textord, "Z", "\u2124");
    defineSymbol(math, main, mathord, "h", "\u210E");
    defineSymbol(text, main, mathord, "h", "\u210E");
    var wideChar;
    for (_i3 = 0; _i3 < letters.length; _i3++) {
      _ch3 = letters.charAt(_i3);
      wideChar = String.fromCharCode(55349, 56320 + _i3);
      defineSymbol(math, main, mathord, _ch3, wideChar);
      defineSymbol(text, main, textord, _ch3, wideChar);
      wideChar = String.fromCharCode(55349, 56372 + _i3);
      defineSymbol(math, main, mathord, _ch3, wideChar);
      defineSymbol(text, main, textord, _ch3, wideChar);
      wideChar = String.fromCharCode(55349, 56424 + _i3);
      defineSymbol(math, main, mathord, _ch3, wideChar);
      defineSymbol(text, main, textord, _ch3, wideChar);
      wideChar = String.fromCharCode(55349, 56580 + _i3);
      defineSymbol(math, main, mathord, _ch3, wideChar);
      defineSymbol(text, main, textord, _ch3, wideChar);
      wideChar = String.fromCharCode(55349, 56684 + _i3);
      defineSymbol(math, main, mathord, _ch3, wideChar);
      defineSymbol(text, main, textord, _ch3, wideChar);
      wideChar = String.fromCharCode(55349, 56736 + _i3);
      defineSymbol(math, main, mathord, _ch3, wideChar);
      defineSymbol(text, main, textord, _ch3, wideChar);
      wideChar = String.fromCharCode(55349, 56788 + _i3);
      defineSymbol(math, main, mathord, _ch3, wideChar);
      defineSymbol(text, main, textord, _ch3, wideChar);
      wideChar = String.fromCharCode(55349, 56840 + _i3);
      defineSymbol(math, main, mathord, _ch3, wideChar);
      defineSymbol(text, main, textord, _ch3, wideChar);
      wideChar = String.fromCharCode(55349, 56944 + _i3);
      defineSymbol(math, main, mathord, _ch3, wideChar);
      defineSymbol(text, main, textord, _ch3, wideChar);
      if (_i3 < 26) {
        wideChar = String.fromCharCode(55349, 56632 + _i3);
        defineSymbol(math, main, mathord, _ch3, wideChar);
        defineSymbol(text, main, textord, _ch3, wideChar);
        wideChar = String.fromCharCode(55349, 56476 + _i3);
        defineSymbol(math, main, mathord, _ch3, wideChar);
        defineSymbol(text, main, textord, _ch3, wideChar);
      }
    }
    var _ch3;
    var _i3;
    wideChar = String.fromCharCode(55349, 56668);
    defineSymbol(math, main, mathord, "k", wideChar);
    defineSymbol(text, main, textord, "k", wideChar);
    for (_i4 = 0; _i4 < 10; _i4++) {
      _ch4 = _i4.toString();
      wideChar = String.fromCharCode(55349, 57294 + _i4);
      defineSymbol(math, main, mathord, _ch4, wideChar);
      defineSymbol(text, main, textord, _ch4, wideChar);
      wideChar = String.fromCharCode(55349, 57314 + _i4);
      defineSymbol(math, main, mathord, _ch4, wideChar);
      defineSymbol(text, main, textord, _ch4, wideChar);
      wideChar = String.fromCharCode(55349, 57324 + _i4);
      defineSymbol(math, main, mathord, _ch4, wideChar);
      defineSymbol(text, main, textord, _ch4, wideChar);
      wideChar = String.fromCharCode(55349, 57334 + _i4);
      defineSymbol(math, main, mathord, _ch4, wideChar);
      defineSymbol(text, main, textord, _ch4, wideChar);
    }
    var _ch4;
    var _i4;
    var extraLatin = "\xD0\xDE\xFE";
    for (_i5 = 0; _i5 < extraLatin.length; _i5++) {
      _ch5 = extraLatin.charAt(_i5);
      defineSymbol(math, main, mathord, _ch5, _ch5);
      defineSymbol(text, main, textord, _ch5, _ch5);
    }
    var _ch5;
    var _i5;
    var boldUpright = {
      mathClass: "mathbf",
      textClass: "textbf",
      font: "Main-Bold"
    };
    var italic = {
      mathClass: "mathnormal",
      textClass: "textit",
      font: "Math-Italic"
    };
    var boldItalic = {
      mathClass: "boldsymbol",
      textClass: "boldsymbol",
      font: "Main-BoldItalic"
    };
    var script = {
      mathClass: "mathscr",
      textClass: "textscr",
      font: "Script-Regular"
    };
    var noFont = {
      mathClass: "",
      textClass: "",
      font: ""
    };
    var fraktur = {
      mathClass: "mathfrak",
      textClass: "textfrak",
      font: "Fraktur-Regular"
    };
    var doubleStruck = {
      mathClass: "mathbb",
      textClass: "textbb",
      font: "AMS-Regular"
    };
    var boldFraktur = {
      mathClass: "mathboldfrak",
      textClass: "textboldfrak",
      font: "Fraktur-Regular"
    };
    var sansSerif = {
      mathClass: "mathsf",
      textClass: "textsf",
      font: "SansSerif-Regular"
    };
    var boldSansSerif = {
      mathClass: "mathboldsf",
      textClass: "textboldsf",
      font: "SansSerif-Bold"
    };
    var italicSansSerif = {
      mathClass: "mathitsf",
      textClass: "textitsf",
      font: "SansSerif-Italic"
    };
    var monospace = {
      mathClass: "mathtt",
      textClass: "texttt",
      font: "Typewriter-Regular"
    };
    var wideLatinLetterData = [
      boldUpright,
      boldUpright,
      // A-Z, a-z
      italic,
      italic,
      // A-Z, a-z
      boldItalic,
      boldItalic,
      // A-Z, a-z
      // Map fancy A-Z letters to script, not calligraphic.
      // This aligns with unicode-math and math fonts (except Cambria Math).
      script,
      noFont,
      // A-Z script, a-z — no font
      noFont,
      noFont,
      // A-Z bold script, a-z bold script — no font
      fraktur,
      fraktur,
      // A-Z, a-z
      doubleStruck,
      doubleStruck,
      // A-Z double-struck, k double-struck
      // Note that we are using a bold font, but font metrics for regular Fraktur.
      boldFraktur,
      boldFraktur,
      // A-Z, a-z
      sansSerif,
      sansSerif,
      // A-Z, a-z
      boldSansSerif,
      boldSansSerif,
      // A-Z, a-z
      italicSansSerif,
      italicSansSerif,
      // A-Z, a-z
      noFont,
      noFont,
      // A-Z bold italic sans, a-z bold italic sans - no font
      monospace,
      monospace
      // A-Z, a-z
    ];
    var wideNumeralData = [
      boldUpright,
      // 0-9
      noFont,
      // 0-9 double-struck. No KaTeX font.
      sansSerif,
      // 0-9
      boldSansSerif,
      // 0-9
      monospace
      // 0-9
    ];
    var wideCharacterFont = (wideChar2) => {
      var H = wideChar2.charCodeAt(0);
      var L = wideChar2.charCodeAt(1);
      var codePoint = (H - 55296) * 1024 + (L - 56320) + 65536;
      if (119808 <= codePoint && codePoint < 120484) {
        var i = Math.floor((codePoint - 119808) / 26);
        return wideLatinLetterData[i];
      } else if (120782 <= codePoint && codePoint <= 120831) {
        var _i = Math.floor((codePoint - 120782) / 10);
        return wideNumeralData[_i];
      } else if (codePoint === 120485 || codePoint === 120486) {
        return wideLatinLetterData[0];
      } else if (120486 < codePoint && codePoint < 120782) {
        return noFont;
      } else {
        throw new ParseError("Unsupported character: " + wideChar2);
      }
    };
    var lookupSymbol = function lookupSymbol2(value, fontName, mode) {
      if (symbols[mode][value]) {
        var replacement = symbols[mode][value].replace;
        if (replacement) {
          value = replacement;
        }
      }
      return {
        value,
        metrics: getCharacterMetrics(value, fontName, mode)
      };
    };
    var makeSymbol = function makeSymbol2(value, fontName, mode, options, classes) {
      var lookup = lookupSymbol(value, fontName, mode);
      var metrics = lookup.metrics;
      value = lookup.value;
      var symbolNode;
      if (metrics) {
        var italic2 = metrics.italic;
        if (mode === "text" || options && options.font === "mathit") {
          italic2 = 0;
        }
        symbolNode = new SymbolNode(value, metrics.height, metrics.depth, italic2, metrics.skew, metrics.width, classes);
      } else {
        typeof console !== "undefined" && console.warn("No character metrics " + ("for '" + value + "' in style '" + fontName + "' and mode '" + mode + "'"));
        symbolNode = new SymbolNode(value, 0, 0, 0, 0, 0, classes);
      }
      if (options) {
        symbolNode.maxFontSize = options.sizeMultiplier;
        if (options.style.isTight()) {
          symbolNode.classes.push("mtight");
        }
        var color = options.getColor();
        if (color) {
          symbolNode.style.color = color;
        }
      }
      return symbolNode;
    };
    var mathsym = function mathsym2(value, mode, options, classes) {
      if (classes === void 0) {
        classes = [];
      }
      if (options.font === "boldsymbol" && lookupSymbol(value, "Main-Bold", mode).metrics) {
        return makeSymbol(value, "Main-Bold", mode, options, classes.concat(["mathbf"]));
      } else if (value === "\\" || symbols[mode][value].font === "main") {
        return makeSymbol(value, "Main-Regular", mode, options, classes);
      } else {
        return makeSymbol(value, "AMS-Regular", mode, options, classes.concat(["amsrm"]));
      }
    };
    var boldSymbol = function boldSymbol2(value, mode, type) {
      if (type !== "textord" && lookupSymbol(value, "Math-BoldItalic", mode).metrics) {
        return {
          fontName: "Math-BoldItalic",
          fontClass: "boldsymbol"
        };
      } else {
        return {
          fontName: "Main-Bold",
          fontClass: "mathbf"
        };
      }
    };
    var makeOrd = function makeOrd2(group, options, type) {
      var mode = group.mode;
      var text2 = group.text;
      var classes = ["mord"];
      var {
        font,
        fontFamily,
        fontWeight,
        fontShape
      } = options;
      var useFont = mode === "math" || mode === "text" && !!font;
      var fontOrFamily = useFont ? font : fontFamily;
      var wideFontName = "";
      var wideFontClass = "";
      if (text2.charCodeAt(0) === 55349) {
        var wideCharData = wideCharacterFont(text2);
        wideFontName = wideCharData.font;
        wideFontClass = wideCharData[mode + "Class"];
      }
      if (wideFontName) {
        return makeSymbol(text2, wideFontName, mode, options, classes.concat(wideFontClass));
      } else if (fontOrFamily) {
        var fontName;
        var fontClasses;
        if (fontOrFamily === "boldsymbol") {
          var fontData = boldSymbol(text2, mode, type);
          fontName = fontData.fontName;
          fontClasses = [fontData.fontClass];
        } else if (useFont) {
          fontName = fontMap[font].fontName;
          fontClasses = [font];
        } else {
          fontName = retrieveTextFontName(fontFamily, fontWeight, fontShape);
          fontClasses = [fontFamily, fontWeight, fontShape];
        }
        if (lookupSymbol(text2, fontName, mode).metrics) {
          return makeSymbol(text2, fontName, mode, options, classes.concat(fontClasses));
        } else if (ligatures.hasOwnProperty(text2) && fontName.slice(0, 10) === "Typewriter") {
          var parts = [];
          for (var i = 0; i < text2.length; i++) {
            parts.push(makeSymbol(text2[i], fontName, mode, options, classes.concat(fontClasses)));
          }
          return makeFragment(parts);
        }
      }
      if (type === "mathord") {
        return makeSymbol(text2, "Math-Italic", mode, options, classes.concat(["mathnormal"]));
      } else if (type === "textord") {
        var _font = symbols[mode][text2] && symbols[mode][text2].font;
        if (_font === "ams") {
          var _fontName = retrieveTextFontName("amsrm", fontWeight, fontShape);
          return makeSymbol(text2, _fontName, mode, options, classes.concat("amsrm", fontWeight, fontShape));
        } else if (_font === "main" || !_font) {
          var _fontName2 = retrieveTextFontName("textrm", fontWeight, fontShape);
          return makeSymbol(text2, _fontName2, mode, options, classes.concat(fontWeight, fontShape));
        } else {
          var _fontName3 = retrieveTextFontName(_font, fontWeight, fontShape);
          return makeSymbol(text2, _fontName3, mode, options, classes.concat(_fontName3, fontWeight, fontShape));
        }
      } else {
        throw new Error("unexpected type: " + type + " in makeOrd");
      }
    };
    var canCombine = (prev, next) => {
      if (createClass(prev.classes) !== createClass(next.classes) || prev.skew !== next.skew || prev.maxFontSize !== next.maxFontSize || prev.italic !== 0 && prev.hasClass("mathnormal")) {
        return false;
      }
      if (prev.classes.length === 1) {
        var cls = prev.classes[0];
        if (cls === "mbin" || cls === "mord") {
          return false;
        }
      }
      for (var key of Object.keys(prev.style)) {
        if (prev.style[key] !== next.style[key]) {
          return false;
        }
      }
      for (var _key of Object.keys(next.style)) {
        if (prev.style[_key] !== next.style[_key]) {
          return false;
        }
      }
      return true;
    };
    var tryCombineChars = (chars) => {
      for (var i = 0; i < chars.length - 1; i++) {
        var prev = chars[i];
        var next = chars[i + 1];
        if (prev instanceof SymbolNode && next instanceof SymbolNode && canCombine(prev, next)) {
          prev.text += next.text;
          prev.height = Math.max(prev.height, next.height);
          prev.depth = Math.max(prev.depth, next.depth);
          prev.italic = next.italic;
          chars.splice(i + 1, 1);
          i--;
        }
      }
      return chars;
    };
    var sizeElementFromChildren = function sizeElementFromChildren2(elem) {
      var height = 0;
      var depth = 0;
      var maxFontSize = 0;
      for (var i = 0; i < elem.children.length; i++) {
        var child = elem.children[i];
        if (child.height > height) {
          height = child.height;
        }
        if (child.depth > depth) {
          depth = child.depth;
        }
        if (child.maxFontSize > maxFontSize) {
          maxFontSize = child.maxFontSize;
        }
      }
      elem.height = height;
      elem.depth = depth;
      elem.maxFontSize = maxFontSize;
    };
    var makeSpan = function makeSpan2(classes, children, options, style) {
      var span = new Span(classes, children, options, style);
      sizeElementFromChildren(span);
      return span;
    };
    var makeSvgSpan = (classes, children, options, style) => new Span(classes, children, options, style);
    var makeLineSpan = function makeLineSpan2(className, options, thickness) {
      var line = makeSpan([className], [], options);
      line.height = Math.max(thickness || options.fontMetrics().defaultRuleThickness, options.minRuleThickness);
      line.style.borderBottomWidth = makeEm(line.height);
      line.maxFontSize = 1;
      return line;
    };
    var makeAnchor = function makeAnchor2(href, classes, children, options) {
      var anchor = new Anchor(href, classes, children, options);
      sizeElementFromChildren(anchor);
      return anchor;
    };
    var makeFragment = function makeFragment2(children) {
      var fragment = new DocumentFragment(children);
      sizeElementFromChildren(fragment);
      return fragment;
    };
    var wrapFragment = function wrapFragment2(group, options) {
      if (group instanceof DocumentFragment) {
        return makeSpan([], [group], options);
      }
      return group;
    };
    var getVListChildrenAndDepth = function getVListChildrenAndDepth2(params) {
      if (params.positionType === "individualShift") {
        var oldChildren = params.children;
        var children = [oldChildren[0]];
        var _depth = -oldChildren[0].shift - oldChildren[0].elem.depth;
        var currPos = _depth;
        for (var i = 1; i < oldChildren.length; i++) {
          var diff = -oldChildren[i].shift - currPos - oldChildren[i].elem.depth;
          var size = diff - (oldChildren[i - 1].elem.height + oldChildren[i - 1].elem.depth);
          currPos = currPos + diff;
          children.push({
            type: "kern",
            size
          });
          children.push(oldChildren[i]);
        }
        return {
          children,
          depth: _depth
        };
      }
      var depth;
      if (params.positionType === "top") {
        var bottom = params.positionData;
        for (var _i = 0; _i < params.children.length; _i++) {
          var child = params.children[_i];
          bottom -= child.type === "kern" ? child.size : child.elem.height + child.elem.depth;
        }
        depth = bottom;
      } else if (params.positionType === "bottom") {
        depth = -params.positionData;
      } else {
        var firstChild = params.children[0];
        if (firstChild.type !== "elem") {
          throw new Error('First child must have type "elem".');
        }
        if (params.positionType === "shift") {
          depth = -firstChild.elem.depth - params.positionData;
        } else if (params.positionType === "firstBaseline") {
          depth = -firstChild.elem.depth;
        } else {
          throw new Error("Invalid positionType " + params.positionType + ".");
        }
      }
      return {
        children: params.children,
        depth
      };
    };
    var makeVList = function makeVList2(params, options) {
      var {
        children,
        depth
      } = getVListChildrenAndDepth(params);
      var pstrutSize = 0;
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.type === "elem") {
          var elem = child.elem;
          pstrutSize = Math.max(pstrutSize, elem.maxFontSize, elem.height);
        }
      }
      pstrutSize += 2;
      var pstrut = makeSpan(["pstrut"], []);
      pstrut.style.height = makeEm(pstrutSize);
      var realChildren = [];
      var minPos = depth;
      var maxPos = depth;
      var currPos = depth;
      for (var _i2 = 0; _i2 < children.length; _i2++) {
        var _child = children[_i2];
        if (_child.type === "kern") {
          currPos += _child.size;
        } else {
          var _elem = _child.elem;
          var classes = _child.wrapperClasses || [];
          var style = _child.wrapperStyle || {};
          var childWrap = makeSpan(classes, [pstrut, _elem], void 0, style);
          childWrap.style.top = makeEm(-pstrutSize - currPos - _elem.depth);
          if (_child.marginLeft) {
            childWrap.style.marginLeft = _child.marginLeft;
          }
          if (_child.marginRight) {
            childWrap.style.marginRight = _child.marginRight;
          }
          realChildren.push(childWrap);
          currPos += _elem.height + _elem.depth;
        }
        minPos = Math.min(minPos, currPos);
        maxPos = Math.max(maxPos, currPos);
      }
      var vlist = makeSpan(["vlist"], realChildren);
      vlist.style.height = makeEm(maxPos);
      var rows;
      if (minPos < 0) {
        var emptySpan = makeSpan([], []);
        var depthStrut = makeSpan(["vlist"], [emptySpan]);
        depthStrut.style.height = makeEm(-minPos);
        var topStrut = makeSpan(["vlist-s"], [new SymbolNode("\u200B")]);
        rows = [makeSpan(["vlist-r"], [vlist, topStrut]), makeSpan(["vlist-r"], [depthStrut])];
      } else {
        rows = [makeSpan(["vlist-r"], [vlist])];
      }
      var vtable = makeSpan(["vlist-t"], rows);
      if (rows.length === 2) {
        vtable.classes.push("vlist-t2");
      }
      vtable.height = maxPos;
      vtable.depth = -minPos;
      return vtable;
    };
    var makeGlue = (measurement, options) => {
      var rule = makeSpan(["mspace"], [], options);
      var size = calculateSize(measurement, options);
      rule.style.marginRight = makeEm(size);
      return rule;
    };
    var retrieveTextFontName = (fontFamily, fontWeight, fontShape) => {
      var baseFontName;
      var fontStylesName;
      switch (fontFamily) {
        case "amsrm":
          baseFontName = "AMS";
          break;
        case "textrm":
          baseFontName = "Main";
          break;
        case "textsf":
          baseFontName = "SansSerif";
          break;
        case "texttt":
          baseFontName = "Typewriter";
          break;
        default:
          baseFontName = fontFamily;
      }
      if (fontWeight === "textbf" && fontShape === "textit") {
        fontStylesName = "BoldItalic";
      } else if (fontWeight === "textbf") {
        fontStylesName = "Bold";
      } else if (fontShape === "textit") {
        fontStylesName = "Italic";
      } else {
        fontStylesName = "Regular";
      }
      return baseFontName + "-" + fontStylesName;
    };
    var fontMap = {
      // styles
      "mathbf": {
        variant: "bold",
        fontName: "Main-Bold"
      },
      "mathrm": {
        variant: "normal",
        fontName: "Main-Regular"
      },
      "textit": {
        variant: "italic",
        fontName: "Main-Italic"
      },
      "mathit": {
        variant: "italic",
        fontName: "Main-Italic"
      },
      "mathnormal": {
        variant: "italic",
        fontName: "Math-Italic"
      },
      "mathsfit": {
        variant: "sans-serif-italic",
        fontName: "SansSerif-Italic"
      },
      // "boldsymbol" is missing because they require the use of multiple fonts:
      // Math-BoldItalic and Main-Bold.  This is handled by a special case in
      // makeOrd which ends up calling boldsymbol.
      // families
      "mathbb": {
        variant: "double-struck",
        fontName: "AMS-Regular"
      },
      "mathcal": {
        variant: "script",
        fontName: "Caligraphic-Regular"
      },
      "mathfrak": {
        variant: "fraktur",
        fontName: "Fraktur-Regular"
      },
      "mathscr": {
        variant: "script",
        fontName: "Script-Regular"
      },
      "mathsf": {
        variant: "sans-serif",
        fontName: "SansSerif-Regular"
      },
      "mathtt": {
        variant: "monospace",
        fontName: "Typewriter-Regular"
      }
    };
    var svgData = {
      //   path, width, height
      vec: ["vec", 0.471, 0.714],
      // values from the font glyph
      oiintSize1: ["oiintSize1", 0.957, 0.499],
      // oval to overlay the integrand
      oiintSize2: ["oiintSize2", 1.472, 0.659],
      oiiintSize1: ["oiiintSize1", 1.304, 0.499],
      oiiintSize2: ["oiiintSize2", 1.98, 0.659]
    };
    var staticSvg = function staticSvg2(value, options) {
      var [pathName, width, height] = svgData[value];
      var path2 = new PathNode(pathName);
      var svgNode = new SvgNode([path2], {
        "width": makeEm(width),
        "height": makeEm(height),
        // Override CSS rule `.katex svg { width: 100% }`
        "style": "width:" + makeEm(width),
        "viewBox": "0 0 " + 1e3 * width + " " + 1e3 * height,
        "preserveAspectRatio": "xMinYMin"
      });
      var span = makeSvgSpan(["overlay"], [svgNode], options);
      span.height = height;
      span.style.height = makeEm(height);
      span.style.width = makeEm(width);
      return span;
    };
    var thinspace = {
      number: 3,
      unit: "mu"
    };
    var mediumspace = {
      number: 4,
      unit: "mu"
    };
    var thickspace = {
      number: 5,
      unit: "mu"
    };
    var spacings = {
      mord: {
        mop: thinspace,
        mbin: mediumspace,
        mrel: thickspace,
        minner: thinspace
      },
      mop: {
        mord: thinspace,
        mop: thinspace,
        mrel: thickspace,
        minner: thinspace
      },
      mbin: {
        mord: mediumspace,
        mop: mediumspace,
        mopen: mediumspace,
        minner: mediumspace
      },
      mrel: {
        mord: thickspace,
        mop: thickspace,
        mopen: thickspace,
        minner: thickspace
      },
      mopen: {},
      mclose: {
        mop: thinspace,
        mbin: mediumspace,
        mrel: thickspace,
        minner: thinspace
      },
      mpunct: {
        mord: thinspace,
        mop: thinspace,
        mrel: thickspace,
        mopen: thinspace,
        mclose: thinspace,
        mpunct: thinspace,
        minner: thinspace
      },
      minner: {
        mord: thinspace,
        mop: thinspace,
        mbin: mediumspace,
        mrel: thickspace,
        mopen: thinspace,
        mpunct: thinspace,
        minner: thinspace
      }
    };
    var tightSpacings = {
      mord: {
        mop: thinspace
      },
      mop: {
        mord: thinspace,
        mop: thinspace
      },
      mbin: {},
      mrel: {},
      mopen: {},
      mclose: {
        mop: thinspace
      },
      mpunct: {},
      minner: {
        mop: thinspace
      }
    };
    var _functions = {};
    var _htmlGroupBuilders = {};
    var _mathmlGroupBuilders = {};
    function defineFunction(_ref) {
      var {
        type,
        names,
        props,
        handler,
        htmlBuilder: htmlBuilder3,
        mathmlBuilder: mathmlBuilder3
      } = _ref;
      var data = {
        type,
        numArgs: props.numArgs,
        argTypes: props.argTypes,
        allowedInArgument: !!props.allowedInArgument,
        allowedInText: !!props.allowedInText,
        allowedInMath: props.allowedInMath === void 0 ? true : props.allowedInMath,
        numOptionalArgs: props.numOptionalArgs || 0,
        infix: !!props.infix,
        primitive: !!props.primitive,
        handler
      };
      for (var i = 0; i < names.length; ++i) {
        _functions[names[i]] = data;
      }
      if (type) {
        if (htmlBuilder3) {
          _htmlGroupBuilders[type] = htmlBuilder3;
        }
        if (mathmlBuilder3) {
          _mathmlGroupBuilders[type] = mathmlBuilder3;
        }
      }
    }
    function defineFunctionBuilders(_ref2) {
      var {
        type,
        htmlBuilder: htmlBuilder3,
        mathmlBuilder: mathmlBuilder3
      } = _ref2;
      defineFunction({
        type,
        names: [],
        props: {
          numArgs: 0
        },
        handler() {
          throw new Error("Should never be called.");
        },
        htmlBuilder: htmlBuilder3,
        mathmlBuilder: mathmlBuilder3
      });
    }
    var normalizeArgument = function normalizeArgument2(arg) {
      return arg.type === "ordgroup" && arg.body.length === 1 ? arg.body[0] : arg;
    };
    var ordargument = function ordargument2(arg) {
      return arg.type === "ordgroup" ? arg.body : [arg];
    };
    var binLeftCanceller = /* @__PURE__ */ new Set(["leftmost", "mbin", "mopen", "mrel", "mop", "mpunct"]);
    var binRightCanceller = /* @__PURE__ */ new Set(["rightmost", "mrel", "mclose", "mpunct"]);
    var styleMap$1 = {
      "display": Style$1.DISPLAY,
      "text": Style$1.TEXT,
      "script": Style$1.SCRIPT,
      "scriptscript": Style$1.SCRIPTSCRIPT
    };
    var DomEnum = {
      mord: "mord",
      mop: "mop",
      mbin: "mbin",
      mrel: "mrel",
      mopen: "mopen",
      mclose: "mclose",
      mpunct: "mpunct",
      minner: "minner"
    };
    var buildExpression$1 = function buildExpression(expression, options, isRealGroup, surrounding) {
      if (surrounding === void 0) {
        surrounding = [null, null];
      }
      var groups = [];
      for (var i = 0; i < expression.length; i++) {
        var output = buildGroup$1(expression[i], options);
        if (output instanceof DocumentFragment) {
          var children = output.children;
          groups.push(...children);
        } else {
          groups.push(output);
        }
      }
      tryCombineChars(groups);
      if (!isRealGroup) {
        return groups;
      }
      var glueOptions = options;
      if (expression.length === 1) {
        var node = expression[0];
        if (node.type === "sizing") {
          glueOptions = options.havingSize(node.size);
        } else if (node.type === "styling") {
          glueOptions = options.havingStyle(styleMap$1[node.style]);
        }
      }
      var dummyPrev = makeSpan([surrounding[0] || "leftmost"], [], options);
      var dummyNext = makeSpan([surrounding[1] || "rightmost"], [], options);
      var isRoot = isRealGroup === "root";
      _traverseNonSpaceNodes(groups, (node2, prev) => {
        var prevType = prev.classes[0];
        var type = node2.classes[0];
        if (prevType === "mbin" && binRightCanceller.has(type)) {
          prev.classes[0] = "mord";
        } else if (type === "mbin" && binLeftCanceller.has(prevType)) {
          node2.classes[0] = "mord";
        }
      }, {
        node: dummyPrev
      }, dummyNext, isRoot);
      _traverseNonSpaceNodes(groups, (node2, prev) => {
        var _tightSpacings$prevTy, _spacings$prevType;
        var prevType = getTypeOfDomTree(prev);
        var type = getTypeOfDomTree(node2);
        var space = prevType && type ? node2.hasClass("mtight") ? (_tightSpacings$prevTy = tightSpacings[prevType]) == null ? void 0 : _tightSpacings$prevTy[type] : (_spacings$prevType = spacings[prevType]) == null ? void 0 : _spacings$prevType[type] : null;
        if (space) {
          return makeGlue(space, glueOptions);
        }
      }, {
        node: dummyPrev
      }, dummyNext, isRoot);
      return groups;
    };
    var _traverseNonSpaceNodes = function traverseNonSpaceNodes(nodes, callback, prev, next, isRoot) {
      if (next) {
        nodes.push(next);
      }
      var i = 0;
      for (; i < nodes.length; i++) {
        var node = nodes[i];
        var partialGroup = checkPartialGroup(node);
        if (partialGroup) {
          _traverseNonSpaceNodes(partialGroup.children, callback, prev, null, isRoot);
          continue;
        }
        var nonspace = !node.hasClass("mspace");
        if (nonspace) {
          var result = callback(node, prev.node);
          if (result) {
            if (prev.insertAfter) {
              prev.insertAfter(result);
            } else {
              nodes.unshift(result);
              i++;
            }
          }
        }
        if (nonspace) {
          prev.node = node;
        } else if (isRoot && node.hasClass("newline")) {
          prev.node = makeSpan(["leftmost"]);
        }
        prev.insertAfter = /* @__PURE__ */ ((index) => (n) => {
          nodes.splice(index + 1, 0, n);
          i++;
        })(i);
      }
      if (next) {
        nodes.pop();
      }
    };
    var checkPartialGroup = function checkPartialGroup2(node) {
      if (node instanceof DocumentFragment || node instanceof Anchor || node instanceof Span && node.hasClass("enclosing")) {
        return node;
      }
      return null;
    };
    var _getOutermostNode = function getOutermostNode(node, side) {
      var partialGroup = checkPartialGroup(node);
      if (partialGroup) {
        var children = partialGroup.children;
        if (children.length) {
          if (side === "right") {
            return _getOutermostNode(children[children.length - 1], "right");
          } else if (side === "left") {
            return _getOutermostNode(children[0], "left");
          }
        }
      }
      return node;
    };
    var getTypeOfDomTree = function getTypeOfDomTree2(node, side) {
      if (!node) {
        return null;
      }
      if (side) {
        node = _getOutermostNode(node, side);
      }
      var className = node.classes[0];
      return DomEnum[className] || null;
    };
    var makeNullDelimiter = function makeNullDelimiter2(options, classes) {
      var moreClasses = ["nulldelimiter"].concat(options.baseSizingClasses());
      return makeSpan(classes.concat(moreClasses));
    };
    var buildGroup$1 = function buildGroup(group, options, baseOptions) {
      if (!group) {
        return makeSpan();
      }
      if (_htmlGroupBuilders[group.type]) {
        var groupNode = _htmlGroupBuilders[group.type](group, options);
        if (baseOptions && options.size !== baseOptions.size) {
          groupNode = makeSpan(options.sizingClasses(baseOptions), [groupNode], options);
          var multiplier = options.sizeMultiplier / baseOptions.sizeMultiplier;
          groupNode.height *= multiplier;
          groupNode.depth *= multiplier;
        }
        return groupNode;
      } else {
        throw new ParseError("Got group of unknown type: '" + group.type + "'");
      }
    };
    function buildHTMLUnbreakable(children, options) {
      var body = makeSpan(["base"], children, options);
      var strut = makeSpan(["strut"]);
      strut.style.height = makeEm(body.height + body.depth);
      if (body.depth) {
        strut.style.verticalAlign = makeEm(-body.depth);
      }
      body.children.unshift(strut);
      return body;
    }
    function buildHTML(tree, options) {
      var tag = null;
      if (tree.length === 1 && tree[0].type === "tag") {
        tag = tree[0].tag;
        tree = tree[0].body;
      }
      var expression = buildExpression$1(tree, options, "root");
      var eqnNum;
      if (expression.length === 2 && expression[1].hasClass("tag")) {
        eqnNum = expression.pop();
      }
      var children = [];
      var parts = [];
      for (var i = 0; i < expression.length; i++) {
        parts.push(expression[i]);
        if (expression[i].hasClass("mbin") || expression[i].hasClass("mrel") || expression[i].hasClass("allowbreak")) {
          var nobreak = false;
          while (i < expression.length - 1 && expression[i + 1].hasClass("mspace") && !expression[i + 1].hasClass("newline")) {
            i++;
            parts.push(expression[i]);
            if (expression[i].hasClass("nobreak")) {
              nobreak = true;
            }
          }
          if (!nobreak) {
            children.push(buildHTMLUnbreakable(parts, options));
            parts = [];
          }
        } else if (expression[i].hasClass("newline")) {
          parts.pop();
          if (parts.length > 0) {
            children.push(buildHTMLUnbreakable(parts, options));
            parts = [];
          }
          children.push(expression[i]);
        }
      }
      if (parts.length > 0) {
        children.push(buildHTMLUnbreakable(parts, options));
      }
      var tagChild;
      if (tag) {
        tagChild = buildHTMLUnbreakable(buildExpression$1(tag, options, true), options);
        tagChild.classes = ["tag"];
        children.push(tagChild);
      } else if (eqnNum) {
        children.push(eqnNum);
      }
      var htmlNode = makeSpan(["katex-html"], children);
      htmlNode.setAttribute("aria-hidden", "true");
      if (tagChild) {
        var strut = tagChild.children[0];
        strut.style.height = makeEm(htmlNode.height + htmlNode.depth);
        if (htmlNode.depth) {
          strut.style.verticalAlign = makeEm(-htmlNode.depth);
        }
      }
      return htmlNode;
    }
    function newDocumentFragment(children) {
      return new DocumentFragment(children);
    }
    var MathNode = class {
      constructor(type, children, classes) {
        this.type = void 0;
        this.attributes = void 0;
        this.children = void 0;
        this.classes = void 0;
        this.type = type;
        this.attributes = {};
        this.children = children || [];
        this.classes = classes || [];
      }
      /**
       * Sets an attribute on a MathML node. MathML depends on attributes to convey a
       * semantic content, so this is used heavily.
       */
      setAttribute(name2, value) {
        this.attributes[name2] = value;
      }
      /**
       * Gets an attribute on a MathML node.
       */
      getAttribute(name2) {
        return this.attributes[name2];
      }
      /**
       * Converts the math node into a MathML-namespaced DOM element.
       */
      toNode() {
        var node = document.createElementNS("http://www.w3.org/1998/Math/MathML", this.type);
        for (var attr in this.attributes) {
          if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
            node.setAttribute(attr, this.attributes[attr]);
          }
        }
        if (this.classes.length > 0) {
          node.className = createClass(this.classes);
        }
        for (var i = 0; i < this.children.length; i++) {
          if (this.children[i] instanceof TextNode && this.children[i + 1] instanceof TextNode) {
            var text2 = this.children[i].toText() + this.children[++i].toText();
            while (this.children[i + 1] instanceof TextNode) {
              text2 += this.children[++i].toText();
            }
            node.appendChild(new TextNode(text2).toNode());
          } else {
            node.appendChild(this.children[i].toNode());
          }
        }
        return node;
      }
      /**
       * Converts the math node into an HTML markup string.
       */
      toMarkup() {
        var markup = "<" + this.type;
        for (var attr in this.attributes) {
          if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
            markup += " " + attr + '="';
            markup += escape(this.attributes[attr]);
            markup += '"';
          }
        }
        if (this.classes.length > 0) {
          markup += ' class ="' + escape(createClass(this.classes)) + '"';
        }
        markup += ">";
        for (var i = 0; i < this.children.length; i++) {
          markup += this.children[i].toMarkup();
        }
        markup += "</" + this.type + ">";
        return markup;
      }
      /**
       * Converts the math node into a string, similar to innerText, but escaped.
       */
      toText() {
        return this.children.map((child) => child.toText()).join("");
      }
    };
    var TextNode = class {
      constructor(text2) {
        this.text = void 0;
        this.text = text2;
      }
      /**
       * Converts the text node into a DOM text node.
       */
      toNode() {
        return document.createTextNode(this.text);
      }
      /**
       * Converts the text node into escaped HTML markup
       * (representing the text itself).
       */
      toMarkup() {
        return escape(this.toText());
      }
      /**
       * Converts the text node into a string
       * (representing the text itself).
       */
      toText() {
        return this.text;
      }
    };
    var SpaceNode = class {
      /**
       * Create a Space node with width given in CSS ems.
       */
      constructor(width) {
        this.width = void 0;
        this.character = void 0;
        this.width = width;
        if (width >= 0.05555 && width <= 0.05556) {
          this.character = "\u200A";
        } else if (width >= 0.1666 && width <= 0.1667) {
          this.character = "\u2009";
        } else if (width >= 0.2222 && width <= 0.2223) {
          this.character = "\u2005";
        } else if (width >= 0.2777 && width <= 0.2778) {
          this.character = "\u2005\u200A";
        } else if (width >= -0.05556 && width <= -0.05555) {
          this.character = "\u200A\u2063";
        } else if (width >= -0.1667 && width <= -0.1666) {
          this.character = "\u2009\u2063";
        } else if (width >= -0.2223 && width <= -0.2222) {
          this.character = "\u205F\u2063";
        } else if (width >= -0.2778 && width <= -0.2777) {
          this.character = "\u2005\u2063";
        } else {
          this.character = null;
        }
      }
      /**
       * Converts the math node into a MathML-namespaced DOM element.
       */
      toNode() {
        if (this.character) {
          return document.createTextNode(this.character);
        } else {
          var node = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mspace");
          node.setAttribute("width", makeEm(this.width));
          return node;
        }
      }
      /**
       * Converts the math node into an HTML markup string.
       */
      toMarkup() {
        if (this.character) {
          return "<mtext>" + this.character + "</mtext>";
        } else {
          return '<mspace width="' + makeEm(this.width) + '"/>';
        }
      }
      /**
       * Converts the math node into a string, similar to innerText.
       */
      toText() {
        if (this.character) {
          return this.character;
        } else {
          return " ";
        }
      }
    };
    var noVariantSymbols = /* @__PURE__ */ new Set(["\\imath", "\\jmath"]);
    var rowLikeTypes = /* @__PURE__ */ new Set(["mrow", "mtable"]);
    var makeText = function makeText2(text2, mode, options) {
      if (symbols[mode][text2] && symbols[mode][text2].replace && text2.charCodeAt(0) !== 55349 && !(ligatures.hasOwnProperty(text2) && options && (options.fontFamily && options.fontFamily.slice(4, 6) === "tt" || options.font && options.font.slice(4, 6) === "tt"))) {
        text2 = symbols[mode][text2].replace;
      }
      return new TextNode(text2);
    };
    var makeRow = function makeRow2(body) {
      if (body.length === 1) {
        return body[0];
      } else {
        return new MathNode("mrow", body);
      }
    };
    var mathFontVariants = {
      mathit: "italic",
      boldsymbol: (group) => group.type === "textord" ? "bold" : "bold-italic",
      mathbf: "bold",
      mathbb: "double-struck",
      mathsfit: "sans-serif-italic",
      mathfrak: "fraktur",
      mathscr: "script",
      mathcal: "script",
      mathsf: "sans-serif",
      mathtt: "monospace"
    };
    var getVariant = (group, options) => {
      if (group.mode === "text") {
        if (options.fontFamily === "texttt") {
          return "monospace";
        } else if (options.fontFamily === "textsf") {
          if (options.fontShape === "textit" && options.fontWeight === "textbf") {
            return "sans-serif-bold-italic";
          } else if (options.fontShape === "textit") {
            return "sans-serif-italic";
          } else if (options.fontWeight === "textbf") {
            return "bold-sans-serif";
          } else {
            return "sans-serif";
          }
        } else if (options.fontShape === "textit" && options.fontWeight === "textbf") {
          return "bold-italic";
        } else if (options.fontShape === "textit") {
          return "italic";
        } else if (options.fontWeight === "textbf") {
          return "bold";
        }
      }
      var font = options.font;
      if (!font || font === "mathnormal") {
        return null;
      }
      var mode = group.mode;
      var mathVariant = mathFontVariants[font];
      if (mathVariant) {
        return typeof mathVariant === "function" ? mathVariant(group) : mathVariant;
      }
      var text2 = group.text;
      if (noVariantSymbols.has(text2)) {
        return null;
      }
      if (symbols[mode][text2]) {
        var replacement = symbols[mode][text2].replace;
        if (replacement) {
          text2 = replacement;
        }
      }
      var fontName = fontMap[font].fontName;
      if (getCharacterMetrics(text2, fontName, mode)) {
        return fontMap[font].variant;
      }
      return null;
    };
    function isNumberPunctuation(group) {
      if (!group) {
        return false;
      }
      if (group.type === "mi" && group.children.length === 1) {
        var child = group.children[0];
        return child instanceof TextNode && child.text === ".";
      } else if (group.type === "mo" && group.children.length === 1 && group.getAttribute("separator") === "true" && group.getAttribute("lspace") === "0em" && group.getAttribute("rspace") === "0em") {
        var _child = group.children[0];
        return _child instanceof TextNode && _child.text === ",";
      } else {
        return false;
      }
    }
    var buildExpression2 = function buildExpression3(expression, options, isOrdgroup) {
      if (expression.length === 1) {
        var group = buildGroup2(expression[0], options);
        if (isOrdgroup && group instanceof MathNode && group.type === "mo") {
          group.setAttribute("lspace", "0em");
          group.setAttribute("rspace", "0em");
        }
        return [group];
      }
      var groups = [];
      var lastGroup;
      for (var i = 0; i < expression.length; i++) {
        var _group = buildGroup2(expression[i], options);
        if (_group instanceof MathNode && lastGroup instanceof MathNode) {
          if (_group.type === "mtext" && lastGroup.type === "mtext" && _group.getAttribute("mathvariant") === lastGroup.getAttribute("mathvariant")) {
            lastGroup.children.push(..._group.children);
            continue;
          } else if (_group.type === "mn" && lastGroup.type === "mn") {
            lastGroup.children.push(..._group.children);
            continue;
          } else if (isNumberPunctuation(_group) && lastGroup.type === "mn") {
            lastGroup.children.push(..._group.children);
            continue;
          } else if (_group.type === "mn" && isNumberPunctuation(lastGroup)) {
            _group.children = [...lastGroup.children, ..._group.children];
            groups.pop();
          } else if ((_group.type === "msup" || _group.type === "msub") && _group.children.length >= 1 && (lastGroup.type === "mn" || isNumberPunctuation(lastGroup))) {
            var base = _group.children[0];
            if (base instanceof MathNode && base.type === "mn") {
              base.children = [...lastGroup.children, ...base.children];
              groups.pop();
            }
          } else if (lastGroup.type === "mi" && lastGroup.children.length === 1) {
            var lastChild = lastGroup.children[0];
            if (lastChild instanceof TextNode && lastChild.text === "\u0338" && (_group.type === "mo" || _group.type === "mi" || _group.type === "mn")) {
              var child = _group.children[0];
              if (child instanceof TextNode && child.text.length > 0) {
                child.text = child.text.slice(0, 1) + "\u0338" + child.text.slice(1);
                groups.pop();
              }
            }
          }
        }
        groups.push(_group);
        lastGroup = _group;
      }
      return groups;
    };
    var buildExpressionRow = function buildExpressionRow2(expression, options, isOrdgroup) {
      return makeRow(buildExpression2(expression, options, isOrdgroup));
    };
    var buildGroup2 = function buildGroup3(group, options) {
      if (!group) {
        return new MathNode("mrow");
      }
      if (_mathmlGroupBuilders[group.type]) {
        return _mathmlGroupBuilders[group.type](group, options);
      } else {
        throw new ParseError("Got group of unknown type: '" + group.type + "'");
      }
    };
    function buildMathML(tree, texExpression, options, isDisplayMode, forMathmlOnly) {
      var expression = buildExpression2(tree, options);
      var wrapper;
      if (expression.length === 1 && expression[0] instanceof MathNode && rowLikeTypes.has(expression[0].type)) {
        wrapper = expression[0];
      } else {
        wrapper = new MathNode("mrow", expression);
      }
      var annotation = new MathNode("annotation", [new TextNode(texExpression)]);
      annotation.setAttribute("encoding", "application/x-tex");
      var semantics = new MathNode("semantics", [wrapper, annotation]);
      var math2 = new MathNode("math", [semantics]);
      math2.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
      if (isDisplayMode) {
        math2.setAttribute("display", "block");
      }
      var wrapperClass = forMathmlOnly ? "katex" : "katex-mathml";
      return makeSpan([wrapperClass], [math2]);
    }
    var sizeStyleMap = [
      // Each element contains [textsize, scriptsize, scriptscriptsize].
      // The size mappings are taken from TeX with \normalsize=10pt.
      [1, 1, 1],
      // size1: [5, 5, 5]              \tiny
      [2, 1, 1],
      // size2: [6, 5, 5]
      [3, 1, 1],
      // size3: [7, 5, 5]              \scriptsize
      [4, 2, 1],
      // size4: [8, 6, 5]              \footnotesize
      [5, 2, 1],
      // size5: [9, 6, 5]              \small
      [6, 3, 1],
      // size6: [10, 7, 5]             \normalsize
      [7, 4, 2],
      // size7: [12, 8, 6]             \large
      [8, 6, 3],
      // size8: [14.4, 10, 7]          \Large
      [9, 7, 6],
      // size9: [17.28, 12, 10]        \LARGE
      [10, 8, 7],
      // size10: [20.74, 14.4, 12]     \huge
      [11, 10, 9]
      // size11: [24.88, 20.74, 17.28] \HUGE
    ];
    var sizeMultipliers = [
      // fontMetrics.js:getGlobalMetrics also uses size indexes, so if
      // you change size indexes, change that function.
      0.5,
      0.6,
      0.7,
      0.8,
      0.9,
      1,
      1.2,
      1.44,
      1.728,
      2.074,
      2.488
    ];
    var sizeAtStyle = function sizeAtStyle2(size, style) {
      return style.size < 2 ? size : sizeStyleMap[size - 1][style.size - 1];
    };
    var Options = class _Options {
      constructor(data) {
        this.style = void 0;
        this.color = void 0;
        this.size = void 0;
        this.textSize = void 0;
        this.phantom = void 0;
        this.font = void 0;
        this.fontFamily = void 0;
        this.fontWeight = void 0;
        this.fontShape = void 0;
        this.sizeMultiplier = void 0;
        this.maxSize = void 0;
        this.minRuleThickness = void 0;
        this._fontMetrics = void 0;
        this.style = data.style;
        this.color = data.color;
        this.size = data.size || _Options.BASESIZE;
        this.textSize = data.textSize || this.size;
        this.phantom = !!data.phantom;
        this.font = data.font || "";
        this.fontFamily = data.fontFamily || "";
        this.fontWeight = data.fontWeight || "";
        this.fontShape = data.fontShape || "";
        this.sizeMultiplier = sizeMultipliers[this.size - 1];
        this.maxSize = data.maxSize;
        this.minRuleThickness = data.minRuleThickness;
        this._fontMetrics = void 0;
      }
      /**
       * Returns a new options object with the same properties as "this".  Properties
       * from "extension" will be copied to the new options object.
       */
      extend(extension) {
        var data = {
          style: this.style,
          size: this.size,
          textSize: this.textSize,
          color: this.color,
          phantom: this.phantom,
          font: this.font,
          fontFamily: this.fontFamily,
          fontWeight: this.fontWeight,
          fontShape: this.fontShape,
          maxSize: this.maxSize,
          minRuleThickness: this.minRuleThickness
        };
        Object.assign(data, extension);
        return new _Options(data);
      }
      /**
       * Return an options object with the given style. If `this.style === style`,
       * returns `this`.
       */
      havingStyle(style) {
        if (this.style === style) {
          return this;
        } else {
          return this.extend({
            style,
            size: sizeAtStyle(this.textSize, style)
          });
        }
      }
      /**
       * Return an options object with a cramped version of the current style. If
       * the current style is cramped, returns `this`.
       */
      havingCrampedStyle() {
        return this.havingStyle(this.style.cramp());
      }
      /**
       * Return an options object with the given size and in at least `\textstyle`.
       * Returns `this` if appropriate.
       */
      havingSize(size) {
        if (this.size === size && this.textSize === size) {
          return this;
        } else {
          return this.extend({
            style: this.style.text(),
            size,
            textSize: size,
            sizeMultiplier: sizeMultipliers[size - 1]
          });
        }
      }
      /**
       * Like `this.havingSize(BASESIZE).havingStyle(style)`. If `style` is omitted,
       * changes to at least `\textstyle`.
       */
      havingBaseStyle(style) {
        style = style || this.style.text();
        var wantSize = sizeAtStyle(_Options.BASESIZE, style);
        if (this.size === wantSize && this.textSize === _Options.BASESIZE && this.style === style) {
          return this;
        } else {
          return this.extend({
            style,
            size: wantSize
          });
        }
      }
      /**
       * Remove the effect of sizing changes such as \Huge.
       * Keep the effect of the current style, such as \scriptstyle.
       */
      havingBaseSizing() {
        var size;
        switch (this.style.id) {
          case 4:
          case 5:
            size = 3;
            break;
          case 6:
          case 7:
            size = 1;
            break;
          default:
            size = 6;
        }
        return this.extend({
          style: this.style.text(),
          size
        });
      }
      /**
       * Create a new options object with the given color.
       */
      withColor(color) {
        return this.extend({
          color
        });
      }
      /**
       * Create a new options object with "phantom" set to true.
       */
      withPhantom() {
        return this.extend({
          phantom: true
        });
      }
      /**
       * Creates a new options object with the given math font or old text font.
       * @type {[type]}
       */
      withFont(font) {
        return this.extend({
          font
        });
      }
      /**
       * Create a new options objects with the given fontFamily.
       */
      withTextFontFamily(fontFamily) {
        return this.extend({
          fontFamily,
          font: ""
        });
      }
      /**
       * Creates a new options object with the given font weight
       */
      withTextFontWeight(fontWeight) {
        return this.extend({
          fontWeight,
          font: ""
        });
      }
      /**
       * Creates a new options object with the given font weight
       */
      withTextFontShape(fontShape) {
        return this.extend({
          fontShape,
          font: ""
        });
      }
      /**
       * Return the CSS sizing classes required to switch from enclosing options
       * `oldOptions` to `this`. Returns an array of classes.
       */
      sizingClasses(oldOptions) {
        if (oldOptions.size !== this.size) {
          return ["sizing", "reset-size" + oldOptions.size, "size" + this.size];
        } else {
          return [];
        }
      }
      /**
       * Return the CSS sizing classes required to switch to the base size. Like
       * `this.havingSize(BASESIZE).sizingClasses(this)`.
       */
      baseSizingClasses() {
        if (this.size !== _Options.BASESIZE) {
          return ["sizing", "reset-size" + this.size, "size" + _Options.BASESIZE];
        } else {
          return [];
        }
      }
      /**
       * Return the font metrics for this size.
       */
      fontMetrics() {
        if (!this._fontMetrics) {
          this._fontMetrics = getGlobalMetrics(this.size);
        }
        return this._fontMetrics;
      }
      /**
       * Gets the CSS color of the current options object
       */
      getColor() {
        if (this.phantom) {
          return "transparent";
        } else {
          return this.color;
        }
      }
    };
    Options.BASESIZE = 6;
    var optionsFromSettings = function optionsFromSettings2(settings) {
      return new Options({
        style: settings.displayMode ? Style$1.DISPLAY : Style$1.TEXT,
        maxSize: settings.maxSize,
        minRuleThickness: settings.minRuleThickness
      });
    };
    var displayWrap = function displayWrap2(node, settings) {
      if (settings.displayMode) {
        var classes = ["katex-display"];
        if (settings.leqno) {
          classes.push("leqno");
        }
        if (settings.fleqn) {
          classes.push("fleqn");
        }
        node = makeSpan(classes, [node]);
      }
      return node;
    };
    var buildTree = function buildTree2(tree, expression, settings) {
      var options = optionsFromSettings(settings);
      var katexNode;
      if (settings.output === "mathml") {
        return buildMathML(tree, expression, options, settings.displayMode, true);
      } else if (settings.output === "html") {
        var htmlNode = buildHTML(tree, options);
        katexNode = makeSpan(["katex"], [htmlNode]);
      } else {
        var mathMLNode = buildMathML(tree, expression, options, settings.displayMode, false);
        var _htmlNode = buildHTML(tree, options);
        katexNode = makeSpan(["katex"], [mathMLNode, _htmlNode]);
      }
      return displayWrap(katexNode, settings);
    };
    var buildHTMLTree = function buildHTMLTree2(tree, expression, settings) {
      var options = optionsFromSettings(settings);
      var htmlNode = buildHTML(tree, options);
      var katexNode = makeSpan(["katex"], [htmlNode]);
      return displayWrap(katexNode, settings);
    };
    var stretchyCodePoint = {
      widehat: "^",
      widecheck: "\u02C7",
      widetilde: "~",
      utilde: "~",
      overleftarrow: "\u2190",
      underleftarrow: "\u2190",
      xleftarrow: "\u2190",
      overrightarrow: "\u2192",
      underrightarrow: "\u2192",
      xrightarrow: "\u2192",
      underbrace: "\u23DF",
      overbrace: "\u23DE",
      underbracket: "\u23B5",
      overbracket: "\u23B4",
      overgroup: "\u23E0",
      undergroup: "\u23E1",
      overleftrightarrow: "\u2194",
      underleftrightarrow: "\u2194",
      xleftrightarrow: "\u2194",
      Overrightarrow: "\u21D2",
      xRightarrow: "\u21D2",
      overleftharpoon: "\u21BC",
      xleftharpoonup: "\u21BC",
      overrightharpoon: "\u21C0",
      xrightharpoonup: "\u21C0",
      xLeftarrow: "\u21D0",
      xLeftrightarrow: "\u21D4",
      xhookleftarrow: "\u21A9",
      xhookrightarrow: "\u21AA",
      xmapsto: "\u21A6",
      xrightharpoondown: "\u21C1",
      xleftharpoondown: "\u21BD",
      xrightleftharpoons: "\u21CC",
      xleftrightharpoons: "\u21CB",
      xtwoheadleftarrow: "\u219E",
      xtwoheadrightarrow: "\u21A0",
      xlongequal: "=",
      xtofrom: "\u21C4",
      xrightleftarrows: "\u21C4",
      xrightequilibrium: "\u21CC",
      // Not a perfect match.
      xleftequilibrium: "\u21CB",
      // None better available.
      "\\cdrightarrow": "\u2192",
      "\\cdleftarrow": "\u2190",
      "\\cdlongequal": "="
    };
    var stretchyMathML = function stretchyMathML2(label) {
      var node = new MathNode("mo", [new TextNode(stretchyCodePoint[label.replace(/^\\/, "")])]);
      node.setAttribute("stretchy", "true");
      return node;
    };
    var katexImagesData = {
      //   path(s), minWidth, height, align
      overrightarrow: [["rightarrow"], 0.888, 522, "xMaxYMin"],
      overleftarrow: [["leftarrow"], 0.888, 522, "xMinYMin"],
      underrightarrow: [["rightarrow"], 0.888, 522, "xMaxYMin"],
      underleftarrow: [["leftarrow"], 0.888, 522, "xMinYMin"],
      xrightarrow: [["rightarrow"], 1.469, 522, "xMaxYMin"],
      "\\cdrightarrow": [["rightarrow"], 3, 522, "xMaxYMin"],
      // CD minwwidth2.5pc
      xleftarrow: [["leftarrow"], 1.469, 522, "xMinYMin"],
      "\\cdleftarrow": [["leftarrow"], 3, 522, "xMinYMin"],
      Overrightarrow: [["doublerightarrow"], 0.888, 560, "xMaxYMin"],
      xRightarrow: [["doublerightarrow"], 1.526, 560, "xMaxYMin"],
      xLeftarrow: [["doubleleftarrow"], 1.526, 560, "xMinYMin"],
      overleftharpoon: [["leftharpoon"], 0.888, 522, "xMinYMin"],
      xleftharpoonup: [["leftharpoon"], 0.888, 522, "xMinYMin"],
      xleftharpoondown: [["leftharpoondown"], 0.888, 522, "xMinYMin"],
      overrightharpoon: [["rightharpoon"], 0.888, 522, "xMaxYMin"],
      xrightharpoonup: [["rightharpoon"], 0.888, 522, "xMaxYMin"],
      xrightharpoondown: [["rightharpoondown"], 0.888, 522, "xMaxYMin"],
      xlongequal: [["longequal"], 0.888, 334, "xMinYMin"],
      "\\cdlongequal": [["longequal"], 3, 334, "xMinYMin"],
      xtwoheadleftarrow: [["twoheadleftarrow"], 0.888, 334, "xMinYMin"],
      xtwoheadrightarrow: [["twoheadrightarrow"], 0.888, 334, "xMaxYMin"],
      overleftrightarrow: [["leftarrow", "rightarrow"], 0.888, 522],
      overbrace: [["leftbrace", "midbrace", "rightbrace"], 1.6, 548],
      underbrace: [["leftbraceunder", "midbraceunder", "rightbraceunder"], 1.6, 548],
      underleftrightarrow: [["leftarrow", "rightarrow"], 0.888, 522],
      xleftrightarrow: [["leftarrow", "rightarrow"], 1.75, 522],
      xLeftrightarrow: [["doubleleftarrow", "doublerightarrow"], 1.75, 560],
      xrightleftharpoons: [["leftharpoondownplus", "rightharpoonplus"], 1.75, 716],
      xleftrightharpoons: [["leftharpoonplus", "rightharpoondownplus"], 1.75, 716],
      xhookleftarrow: [["leftarrow", "righthook"], 1.08, 522],
      xhookrightarrow: [["lefthook", "rightarrow"], 1.08, 522],
      overlinesegment: [["leftlinesegment", "rightlinesegment"], 0.888, 522],
      underlinesegment: [["leftlinesegment", "rightlinesegment"], 0.888, 522],
      overbracket: [["leftbracketover", "rightbracketover"], 1.6, 440],
      underbracket: [["leftbracketunder", "rightbracketunder"], 1.6, 410],
      overgroup: [["leftgroup", "rightgroup"], 0.888, 342],
      undergroup: [["leftgroupunder", "rightgroupunder"], 0.888, 342],
      xmapsto: [["leftmapsto", "rightarrow"], 1.5, 522],
      xtofrom: [["leftToFrom", "rightToFrom"], 1.75, 528],
      // The next three arrows are from the mhchem package.
      // In mhchem.sty, min-length is 2.0em. But these arrows might appear in the
      // document as \xrightarrow or \xrightleftharpoons. Those have
      // min-length = 1.75em, so we set min-length on these next three to match.
      xrightleftarrows: [["baraboveleftarrow", "rightarrowabovebar"], 1.75, 901],
      xrightequilibrium: [["baraboveshortleftharpoon", "rightharpoonaboveshortbar"], 1.75, 716],
      xleftequilibrium: [["shortbaraboveleftharpoon", "shortrightharpoonabovebar"], 1.75, 716]
    };
    var wideAccentLabels = /* @__PURE__ */ new Set(["widehat", "widecheck", "widetilde", "utilde"]);
    var stretchySvg = function stretchySvg2(group, options) {
      function buildSvgSpan_() {
        var viewBoxWidth = 4e5;
        var label = group.label.slice(1);
        if (wideAccentLabels.has(label) && "base" in group) {
          var numChars = group.base.type === "ordgroup" ? group.base.body.length : 1;
          var viewBoxHeight;
          var pathName;
          var _height;
          if (numChars > 5) {
            if (label === "widehat" || label === "widecheck") {
              viewBoxHeight = 420;
              viewBoxWidth = 2364;
              _height = 0.42;
              pathName = label + "4";
            } else {
              viewBoxHeight = 312;
              viewBoxWidth = 2340;
              _height = 0.34;
              pathName = "tilde4";
            }
          } else {
            var imgIndex = [1, 1, 2, 2, 3, 3][numChars];
            if (label === "widehat" || label === "widecheck") {
              viewBoxWidth = [0, 1062, 2364, 2364, 2364][imgIndex];
              viewBoxHeight = [0, 239, 300, 360, 420][imgIndex];
              _height = [0, 0.24, 0.3, 0.3, 0.36, 0.42][imgIndex];
              pathName = label + imgIndex;
            } else {
              viewBoxWidth = [0, 600, 1033, 2339, 2340][imgIndex];
              viewBoxHeight = [0, 260, 286, 306, 312][imgIndex];
              _height = [0, 0.26, 0.286, 0.3, 0.306, 0.34][imgIndex];
              pathName = "tilde" + imgIndex;
            }
          }
          var path2 = new PathNode(pathName);
          var svgNode = new SvgNode([path2], {
            "width": "100%",
            "height": makeEm(_height),
            "viewBox": "0 0 " + viewBoxWidth + " " + viewBoxHeight,
            "preserveAspectRatio": "none"
          });
          return {
            span: makeSvgSpan([], [svgNode], options),
            minWidth: 0,
            height: _height
          };
        } else {
          var spans = [];
          var data = katexImagesData[label];
          if (!data) {
            throw new Error('No SVG data for "' + label + '".');
          }
          var [paths, _minWidth, _viewBoxHeight] = data;
          var _height2 = _viewBoxHeight / 1e3;
          var numSvgChildren = paths.length;
          var widthClasses;
          var aligns;
          if (numSvgChildren === 1) {
            if (data.length !== 4) {
              throw new Error('Expected 4-tuple for single-path SVG data "' + label + '".');
            }
            widthClasses = ["hide-tail"];
            aligns = [data[3]];
          } else if (numSvgChildren === 2) {
            widthClasses = ["halfarrow-left", "halfarrow-right"];
            aligns = ["xMinYMin", "xMaxYMin"];
          } else if (numSvgChildren === 3) {
            widthClasses = ["brace-left", "brace-center", "brace-right"];
            aligns = ["xMinYMin", "xMidYMin", "xMaxYMin"];
          } else {
            throw new Error("Correct katexImagesData or update code here to support\n                    " + numSvgChildren + " children.");
          }
          for (var i = 0; i < numSvgChildren; i++) {
            var _path = new PathNode(paths[i]);
            var _svgNode = new SvgNode([_path], {
              "width": "400em",
              "height": makeEm(_height2),
              "viewBox": "0 0 " + viewBoxWidth + " " + _viewBoxHeight,
              "preserveAspectRatio": aligns[i] + " slice"
            });
            var _span = makeSvgSpan([widthClasses[i]], [_svgNode], options);
            if (numSvgChildren === 1) {
              return {
                span: _span,
                minWidth: _minWidth,
                height: _height2
              };
            } else {
              _span.style.height = makeEm(_height2);
              spans.push(_span);
            }
          }
          return {
            span: makeSpan(["stretchy"], spans, options),
            minWidth: _minWidth,
            height: _height2
          };
        }
      }
      var {
        span,
        minWidth,
        height
      } = buildSvgSpan_();
      span.height = height;
      span.style.height = makeEm(height);
      if (minWidth > 0) {
        span.style.minWidth = makeEm(minWidth);
      }
      return span;
    };
    var stretchyEnclose = function stretchyEnclose2(inner2, label, topPad, bottomPad, options) {
      var img;
      var totalHeight = inner2.height + inner2.depth + topPad + bottomPad;
      if (/fbox|color|angl/.test(label)) {
        img = makeSpan(["stretchy", label], [], options);
        if (label === "fbox") {
          var color = options.color && options.getColor();
          if (color) {
            img.style.borderColor = color;
          }
        }
      } else {
        var lines = [];
        if (/^[bx]cancel$/.test(label)) {
          lines.push(new LineNode({
            "x1": "0",
            "y1": "0",
            "x2": "100%",
            "y2": "100%",
            "stroke-width": "0.046em"
          }));
        }
        if (/^x?cancel$/.test(label)) {
          lines.push(new LineNode({
            "x1": "0",
            "y1": "100%",
            "x2": "100%",
            "y2": "0",
            "stroke-width": "0.046em"
          }));
        }
        var svgNode = new SvgNode(lines, {
          "width": "100%",
          "height": makeEm(totalHeight)
        });
        img = makeSvgSpan([], [svgNode], options);
      }
      img.height = totalHeight;
      img.style.height = makeEm(totalHeight);
      return img;
    };
    var ATOMS = {
      "bin": 1,
      "close": 1,
      "inner": 1,
      "open": 1,
      "punct": 1,
      "rel": 1
    };
    var NON_ATOMS = {
      "accent-token": 1,
      "mathord": 1,
      "op-token": 1,
      "spacing": 1,
      "textord": 1
    };
    function isAtom(value) {
      return value in ATOMS;
    }
    function assertNodeType(node, type) {
      if (!node || node.type !== type) {
        throw new Error("Expected node of type " + type + ", but got " + (node ? "node of type " + node.type : String(node)));
      }
      return node;
    }
    function assertSymbolNodeType(node) {
      var typedNode = checkSymbolNodeType(node);
      if (!typedNode) {
        throw new Error("Expected node of symbol group type, but got " + (node ? "node of type " + node.type : String(node)));
      }
      return typedNode;
    }
    function checkSymbolNodeType(node) {
      if (node && (node.type === "atom" || NON_ATOMS.hasOwnProperty(node.type))) {
        return node;
      }
      return null;
    }
    var getBaseSymbol = (group) => {
      if (group instanceof SymbolNode) {
        return group;
      }
      if (hasHtmlDomChildren(group) && group.children.length === 1) {
        return getBaseSymbol(group.children[0]);
      }
    };
    var htmlBuilder$a = (grp, options) => {
      var base;
      var group;
      var supSubGroup;
      if (grp && grp.type === "supsub") {
        group = assertNodeType(grp.base, "accent");
        base = group.base;
        grp.base = base;
        supSubGroup = assertSpan(buildGroup$1(grp, options));
        grp.base = group;
      } else {
        group = assertNodeType(grp, "accent");
        base = group.base;
      }
      var body = buildGroup$1(base, options.havingCrampedStyle());
      var mustShift = group.isShifty && isCharacterBox(base);
      var skew = 0;
      if (mustShift) {
        var _getBaseSymbol$skew, _getBaseSymbol;
        skew = (_getBaseSymbol$skew = (_getBaseSymbol = getBaseSymbol(body)) == null ? void 0 : _getBaseSymbol.skew) != null ? _getBaseSymbol$skew : 0;
      }
      var accentBelow = group.label === "\\c";
      var clearance = accentBelow ? body.height + body.depth : Math.min(body.height, options.fontMetrics().xHeight);
      var accentBody;
      if (!group.isStretchy) {
        var accent2;
        var width;
        if (group.label === "\\vec") {
          accent2 = staticSvg("vec", options);
          width = svgData.vec[1];
        } else {
          accent2 = makeOrd({
            type: "textord",
            mode: group.mode,
            text: group.label
          }, options, "textord");
          accent2 = assertSymbolDomNode(accent2);
          accent2.italic = 0;
          width = accent2.width;
          if (accentBelow) {
            clearance += accent2.depth;
          }
        }
        accentBody = makeSpan(["accent-body"], [accent2]);
        var accentFull = group.label === "\\textcircled";
        if (accentFull) {
          accentBody.classes.push("accent-full");
          clearance = body.height;
        }
        var left = skew;
        if (!accentFull) {
          left -= width / 2;
        }
        accentBody.style.left = makeEm(left);
        if (group.label === "\\textcircled") {
          accentBody.style.top = ".2em";
        }
        accentBody = makeVList({
          positionType: "firstBaseline",
          children: [{
            type: "elem",
            elem: body
          }, {
            type: "kern",
            size: -clearance
          }, {
            type: "elem",
            elem: accentBody
          }]
        });
      } else {
        accentBody = stretchySvg(group, options);
        accentBody = makeVList({
          positionType: "firstBaseline",
          children: [{
            type: "elem",
            elem: body
          }, {
            type: "elem",
            elem: accentBody,
            wrapperClasses: ["svg-align"],
            wrapperStyle: skew > 0 ? {
              width: "calc(100% - " + makeEm(2 * skew) + ")",
              marginLeft: makeEm(2 * skew)
            } : void 0
          }]
        });
      }
      var accentWrap = makeSpan(["mord", "accent"], [accentBody], options);
      if (supSubGroup) {
        supSubGroup.children[0] = accentWrap;
        supSubGroup.height = Math.max(accentWrap.height, supSubGroup.height);
        supSubGroup.classes[0] = "mord";
        return supSubGroup;
      } else {
        return accentWrap;
      }
    };
    var mathmlBuilder$9 = (group, options) => {
      var accentNode = group.isStretchy ? stretchyMathML(group.label) : new MathNode("mo", [makeText(group.label, group.mode)]);
      var node = new MathNode("mover", [buildGroup2(group.base, options), accentNode]);
      node.setAttribute("accent", "true");
      return node;
    };
    var NON_STRETCHY_ACCENT_REGEX = new RegExp(["\\acute", "\\grave", "\\ddot", "\\tilde", "\\bar", "\\breve", "\\check", "\\hat", "\\vec", "\\dot", "\\mathring"].map((accent2) => "\\" + accent2).join("|"));
    defineFunction({
      type: "accent",
      names: ["\\acute", "\\grave", "\\ddot", "\\tilde", "\\bar", "\\breve", "\\check", "\\hat", "\\vec", "\\dot", "\\mathring", "\\widecheck", "\\widehat", "\\widetilde", "\\overrightarrow", "\\overleftarrow", "\\Overrightarrow", "\\overleftrightarrow", "\\overgroup", "\\overlinesegment", "\\overleftharpoon", "\\overrightharpoon"],
      props: {
        numArgs: 1
      },
      handler: (context, args) => {
        var base = normalizeArgument(args[0]);
        var isStretchy = !NON_STRETCHY_ACCENT_REGEX.test(context.funcName);
        var isShifty = !isStretchy || context.funcName === "\\widehat" || context.funcName === "\\widetilde" || context.funcName === "\\widecheck";
        return {
          type: "accent",
          mode: context.parser.mode,
          label: context.funcName,
          isStretchy,
          isShifty,
          base
        };
      },
      htmlBuilder: htmlBuilder$a,
      mathmlBuilder: mathmlBuilder$9
    });
    defineFunction({
      type: "accent",
      names: ["\\'", "\\`", "\\^", "\\~", "\\=", "\\u", "\\.", '\\"', "\\c", "\\r", "\\H", "\\v", "\\textcircled"],
      props: {
        numArgs: 1,
        allowedInText: true,
        allowedInMath: true,
        // unless in strict mode
        argTypes: ["primitive"]
      },
      handler: (context, args) => {
        var base = args[0];
        var mode = context.parser.mode;
        if (mode === "math") {
          context.parser.settings.reportNonstrict("mathVsTextAccents", "LaTeX's accent " + context.funcName + " works only in text mode");
          mode = "text";
        }
        return {
          type: "accent",
          mode,
          label: context.funcName,
          isStretchy: false,
          isShifty: true,
          base
        };
      },
      htmlBuilder: htmlBuilder$a,
      mathmlBuilder: mathmlBuilder$9
    });
    defineFunction({
      type: "accentUnder",
      names: ["\\underleftarrow", "\\underrightarrow", "\\underleftrightarrow", "\\undergroup", "\\underlinesegment", "\\utilde"],
      props: {
        numArgs: 1
      },
      handler: (_ref, args) => {
        var {
          parser,
          funcName
        } = _ref;
        var base = args[0];
        return {
          type: "accentUnder",
          mode: parser.mode,
          label: funcName,
          base
        };
      },
      htmlBuilder: (group, options) => {
        var innerGroup = buildGroup$1(group.base, options);
        var accentBody = stretchySvg(group, options);
        var kern = group.label === "\\utilde" ? 0.12 : 0;
        var vlist = makeVList({
          positionType: "top",
          positionData: innerGroup.height,
          children: [{
            type: "elem",
            elem: accentBody,
            wrapperClasses: ["svg-align"]
          }, {
            type: "kern",
            size: kern
          }, {
            type: "elem",
            elem: innerGroup
          }]
        });
        return makeSpan(["mord", "accentunder"], [vlist], options);
      },
      mathmlBuilder: (group, options) => {
        var accentNode = stretchyMathML(group.label);
        var node = new MathNode("munder", [buildGroup2(group.base, options), accentNode]);
        node.setAttribute("accentunder", "true");
        return node;
      }
    });
    var paddedNode = (group) => {
      var node = new MathNode("mpadded", group ? [group] : []);
      node.setAttribute("width", "+0.6em");
      node.setAttribute("lspace", "0.3em");
      return node;
    };
    defineFunction({
      type: "xArrow",
      names: [
        "\\xleftarrow",
        "\\xrightarrow",
        "\\xLeftarrow",
        "\\xRightarrow",
        "\\xleftrightarrow",
        "\\xLeftrightarrow",
        "\\xhookleftarrow",
        "\\xhookrightarrow",
        "\\xmapsto",
        "\\xrightharpoondown",
        "\\xrightharpoonup",
        "\\xleftharpoondown",
        "\\xleftharpoonup",
        "\\xrightleftharpoons",
        "\\xleftrightharpoons",
        "\\xlongequal",
        "\\xtwoheadrightarrow",
        "\\xtwoheadleftarrow",
        "\\xtofrom",
        // The next 3 functions are here to support the mhchem extension.
        // Direct use of these functions is discouraged and may break someday.
        "\\xrightleftarrows",
        "\\xrightequilibrium",
        "\\xleftequilibrium",
        // The next 3 functions are here only to support the {CD} environment.
        "\\\\cdrightarrow",
        "\\\\cdleftarrow",
        "\\\\cdlongequal"
      ],
      props: {
        numArgs: 1,
        numOptionalArgs: 1
      },
      handler(_ref, args, optArgs) {
        var {
          parser,
          funcName
        } = _ref;
        return {
          type: "xArrow",
          mode: parser.mode,
          label: funcName,
          body: args[0],
          below: optArgs[0]
        };
      },
      htmlBuilder(group, options) {
        var style = options.style;
        var newOptions = options.havingStyle(style.sup());
        var upperGroup = wrapFragment(buildGroup$1(group.body, newOptions, options), options);
        var arrowPrefix = group.label.slice(0, 2) === "\\x" ? "x" : "cd";
        upperGroup.classes.push(arrowPrefix + "-arrow-pad");
        var lowerGroup;
        if (group.below) {
          newOptions = options.havingStyle(style.sub());
          lowerGroup = wrapFragment(buildGroup$1(group.below, newOptions, options), options);
          lowerGroup.classes.push(arrowPrefix + "-arrow-pad");
        }
        var arrowBody = stretchySvg(group, options);
        var arrowShift = -options.fontMetrics().axisHeight + 0.5 * arrowBody.height;
        var upperShift = -options.fontMetrics().axisHeight - 0.5 * arrowBody.height - 0.111;
        if (upperGroup.depth > 0.25 || group.label === "\\xleftequilibrium") {
          upperShift -= upperGroup.depth;
        }
        var vlist;
        if (lowerGroup) {
          var lowerShift = -options.fontMetrics().axisHeight + lowerGroup.height + 0.5 * arrowBody.height + 0.111;
          vlist = makeVList({
            positionType: "individualShift",
            children: [{
              type: "elem",
              elem: upperGroup,
              shift: upperShift
            }, {
              type: "elem",
              elem: arrowBody,
              shift: arrowShift,
              wrapperClasses: ["svg-align"]
            }, {
              type: "elem",
              elem: lowerGroup,
              shift: lowerShift
            }]
          });
        } else {
          vlist = makeVList({
            positionType: "individualShift",
            children: [{
              type: "elem",
              elem: upperGroup,
              shift: upperShift
            }, {
              type: "elem",
              elem: arrowBody,
              shift: arrowShift,
              wrapperClasses: ["svg-align"]
            }]
          });
        }
        return makeSpan(["mrel", "x-arrow"], [vlist], options);
      },
      mathmlBuilder(group, options) {
        var arrowNode = stretchyMathML(group.label);
        arrowNode.setAttribute("minsize", group.label.charAt(0) === "x" ? "1.75em" : "3.0em");
        var node;
        if (group.body) {
          var upperNode = paddedNode(buildGroup2(group.body, options));
          if (group.below) {
            var lowerNode = paddedNode(buildGroup2(group.below, options));
            node = new MathNode("munderover", [arrowNode, lowerNode, upperNode]);
          } else {
            node = new MathNode("mover", [arrowNode, upperNode]);
          }
        } else if (group.below) {
          var _lowerNode = paddedNode(buildGroup2(group.below, options));
          node = new MathNode("munder", [arrowNode, _lowerNode]);
        } else {
          node = paddedNode();
          node = new MathNode("mover", [arrowNode, node]);
        }
        return node;
      }
    });
    function htmlBuilder$9(group, options) {
      var elements = buildExpression$1(group.body, options, true);
      return makeSpan([group.mclass], elements, options);
    }
    function mathmlBuilder$8(group, options) {
      var node;
      var inner2 = buildExpression2(group.body, options);
      if (group.mclass === "minner") {
        node = new MathNode("mpadded", inner2);
      } else if (group.mclass === "mord") {
        if (group.isCharacterBox) {
          node = inner2[0];
          node.type = "mi";
        } else {
          node = new MathNode("mi", inner2);
        }
      } else {
        if (group.isCharacterBox) {
          node = inner2[0];
          node.type = "mo";
        } else {
          node = new MathNode("mo", inner2);
        }
        if (group.mclass === "mbin") {
          node.attributes.lspace = "0.22em";
          node.attributes.rspace = "0.22em";
        } else if (group.mclass === "mpunct") {
          node.attributes.lspace = "0em";
          node.attributes.rspace = "0.17em";
        } else if (group.mclass === "mopen" || group.mclass === "mclose") {
          node.attributes.lspace = "0em";
          node.attributes.rspace = "0em";
        } else if (group.mclass === "minner") {
          node.attributes.lspace = "0.0556em";
          node.attributes.width = "+0.1111em";
        }
      }
      return node;
    }
    defineFunction({
      type: "mclass",
      names: ["\\mathord", "\\mathbin", "\\mathrel", "\\mathopen", "\\mathclose", "\\mathpunct", "\\mathinner"],
      props: {
        numArgs: 1,
        primitive: true
      },
      handler(_ref, args) {
        var {
          parser,
          funcName
        } = _ref;
        var body = args[0];
        return {
          type: "mclass",
          mode: parser.mode,
          mclass: "m" + funcName.slice(5),
          // TODO(kevinb): don't prefix with 'm'
          body: ordargument(body),
          isCharacterBox: isCharacterBox(body)
        };
      },
      htmlBuilder: htmlBuilder$9,
      mathmlBuilder: mathmlBuilder$8
    });
    var binrelClass = (arg) => {
      var atom = arg.type === "ordgroup" && arg.body.length ? arg.body[0] : arg;
      if (atom.type === "atom" && (atom.family === "bin" || atom.family === "rel")) {
        return "m" + atom.family;
      } else {
        return "mord";
      }
    };
    defineFunction({
      type: "mclass",
      names: ["\\@binrel"],
      props: {
        numArgs: 2
      },
      handler(_ref2, args) {
        var {
          parser
        } = _ref2;
        return {
          type: "mclass",
          mode: parser.mode,
          mclass: binrelClass(args[0]),
          body: ordargument(args[1]),
          isCharacterBox: isCharacterBox(args[1])
        };
      }
    });
    defineFunction({
      type: "mclass",
      names: ["\\stackrel", "\\overset", "\\underset"],
      props: {
        numArgs: 2
      },
      handler(_ref3, args) {
        var {
          parser,
          funcName
        } = _ref3;
        var baseArg = args[1];
        var shiftedArg = args[0];
        var mclass;
        if (funcName !== "\\stackrel") {
          mclass = binrelClass(baseArg);
        } else {
          mclass = "mrel";
        }
        var baseOp = {
          type: "op",
          mode: baseArg.mode,
          limits: true,
          alwaysHandleSupSub: true,
          parentIsSupSub: false,
          symbol: false,
          suppressBaseShift: funcName !== "\\stackrel",
          body: ordargument(baseArg)
        };
        var supsub = {
          type: "supsub",
          mode: shiftedArg.mode,
          base: baseOp,
          sup: funcName === "\\underset" ? null : shiftedArg,
          sub: funcName === "\\underset" ? shiftedArg : null
        };
        return {
          type: "mclass",
          mode: parser.mode,
          mclass,
          body: [supsub],
          isCharacterBox: isCharacterBox(supsub)
        };
      },
      htmlBuilder: htmlBuilder$9,
      mathmlBuilder: mathmlBuilder$8
    });
    defineFunction({
      type: "pmb",
      names: ["\\pmb"],
      props: {
        numArgs: 1,
        allowedInText: true
      },
      handler(_ref, args) {
        var {
          parser
        } = _ref;
        return {
          type: "pmb",
          mode: parser.mode,
          mclass: binrelClass(args[0]),
          body: ordargument(args[0])
        };
      },
      htmlBuilder(group, options) {
        var elements = buildExpression$1(group.body, options, true);
        var node = makeSpan([group.mclass], elements, options);
        node.style.textShadow = "0.02em 0.01em 0.04px";
        return node;
      },
      mathmlBuilder(group, style) {
        var inner2 = buildExpression2(group.body, style);
        var node = new MathNode("mstyle", inner2);
        node.setAttribute("style", "text-shadow: 0.02em 0.01em 0.04px");
        return node;
      }
    });
    var cdArrowFunctionName = {
      ">": "\\\\cdrightarrow",
      "<": "\\\\cdleftarrow",
      "=": "\\\\cdlongequal",
      "A": "\\uparrow",
      "V": "\\downarrow",
      "|": "\\Vert",
      ".": "no arrow"
    };
    var newCell = () => {
      return {
        type: "styling",
        body: [],
        mode: "math",
        style: "display",
        resetFont: true
      };
    };
    var isStartOfArrow = (node) => {
      return node.type === "textord" && node.text === "@";
    };
    var isLabelEnd = (node, endChar) => {
      return (node.type === "mathord" || node.type === "atom") && node.text === endChar;
    };
    function cdArrow(arrowChar, labels, parser) {
      var funcName = cdArrowFunctionName[arrowChar];
      switch (funcName) {
        case "\\\\cdrightarrow":
        case "\\\\cdleftarrow":
          return parser.callFunction(funcName, [labels[0]], [labels[1]]);
        case "\\uparrow":
        case "\\downarrow": {
          var leftLabel = parser.callFunction("\\\\cdleft", [labels[0]], []);
          var bareArrow = {
            type: "atom",
            text: funcName,
            mode: "math",
            family: "rel"
          };
          var sizedArrow = parser.callFunction("\\Big", [bareArrow], []);
          var rightLabel = parser.callFunction("\\\\cdright", [labels[1]], []);
          var arrowGroup = {
            type: "ordgroup",
            mode: "math",
            body: [leftLabel, sizedArrow, rightLabel]
          };
          return parser.callFunction("\\\\cdparent", [arrowGroup], []);
        }
        case "\\\\cdlongequal":
          return parser.callFunction("\\\\cdlongequal", [], []);
        case "\\Vert": {
          var arrow = {
            type: "textord",
            text: "\\Vert",
            mode: "math"
          };
          return parser.callFunction("\\Big", [arrow], []);
        }
        default:
          return {
            type: "textord",
            text: " ",
            mode: "math"
          };
      }
    }
    function parseCD(parser) {
      var parsedRows = [];
      parser.gullet.beginGroup();
      parser.gullet.macros.set("\\cr", "\\\\\\relax");
      parser.gullet.beginGroup();
      while (true) {
        parsedRows.push(parser.parseExpression(false, "\\\\"));
        parser.gullet.endGroup();
        parser.gullet.beginGroup();
        var next = parser.fetch().text;
        if (next === "&" || next === "\\\\") {
          parser.consume();
        } else if (next === "\\end") {
          if (parsedRows[parsedRows.length - 1].length === 0) {
            parsedRows.pop();
          }
          break;
        } else {
          throw new ParseError("Expected \\\\ or \\cr or \\end", parser.nextToken);
        }
      }
      var row = [];
      var body = [row];
      for (var i = 0; i < parsedRows.length; i++) {
        var rowNodes = parsedRows[i];
        var cell = newCell();
        for (var j = 0; j < rowNodes.length; j++) {
          if (!isStartOfArrow(rowNodes[j])) {
            cell.body.push(rowNodes[j]);
          } else {
            row.push(cell);
            j += 1;
            var arrowChar = assertSymbolNodeType(rowNodes[j]).text;
            var labels = new Array(2);
            labels[0] = {
              type: "ordgroup",
              mode: "math",
              body: []
            };
            labels[1] = {
              type: "ordgroup",
              mode: "math",
              body: []
            };
            if ("=|.".includes(arrowChar)) ;
            else if ("<>AV".includes(arrowChar)) {
              for (var labelNum = 0; labelNum < 2; labelNum++) {
                var inLabel = true;
                for (var k = j + 1; k < rowNodes.length; k++) {
                  if (isLabelEnd(rowNodes[k], arrowChar)) {
                    inLabel = false;
                    j = k;
                    break;
                  }
                  if (isStartOfArrow(rowNodes[k])) {
                    throw new ParseError("Missing a " + arrowChar + " character to complete a CD arrow.", rowNodes[k]);
                  }
                  labels[labelNum].body.push(rowNodes[k]);
                }
                if (inLabel) {
                  throw new ParseError("Missing a " + arrowChar + " character to complete a CD arrow.", rowNodes[j]);
                }
              }
            } else {
              throw new ParseError('Expected one of "<>AV=|." after @', rowNodes[j]);
            }
            var arrow = cdArrow(arrowChar, labels, parser);
            var wrappedArrow = {
              type: "styling",
              body: [arrow],
              mode: "math",
              style: "display",
              // CD is always displaystyle.
              resetFont: true
            };
            row.push(wrappedArrow);
            cell = newCell();
          }
        }
        if (i % 2 === 0) {
          row.push(cell);
        } else {
          row.shift();
        }
        row = [];
        body.push(row);
      }
      parser.gullet.endGroup();
      parser.gullet.endGroup();
      var cols = new Array(body[0].length).fill({
        type: "align",
        align: "c",
        pregap: 0.25,
        // CD package sets \enskip between columns.
        postgap: 0.25
        // So pre and post each get half an \enskip, i.e. 0.25em.
      });
      return {
        type: "array",
        mode: "math",
        body,
        arraystretch: 1,
        addJot: true,
        rowGaps: [null],
        cols,
        colSeparationType: "CD",
        hLinesBeforeRow: new Array(body.length + 1).fill([])
      };
    }
    defineFunction({
      type: "cdlabel",
      names: ["\\\\cdleft", "\\\\cdright"],
      props: {
        numArgs: 1
      },
      handler(_ref, args) {
        var {
          parser,
          funcName
        } = _ref;
        return {
          type: "cdlabel",
          mode: parser.mode,
          side: funcName.slice(4),
          label: args[0]
        };
      },
      htmlBuilder(group, options) {
        var newOptions = options.havingStyle(options.style.sup());
        var label = wrapFragment(buildGroup$1(group.label, newOptions, options), options);
        label.classes.push("cd-label-" + group.side);
        label.style.bottom = makeEm(0.8 - label.depth);
        label.height = 0;
        label.depth = 0;
        return label;
      },
      mathmlBuilder(group, options) {
        var label = new MathNode("mrow", [buildGroup2(group.label, options)]);
        label = new MathNode("mpadded", [label]);
        label.setAttribute("width", "0");
        if (group.side === "left") {
          label.setAttribute("lspace", "-1width");
        }
        label.setAttribute("voffset", "0.7em");
        label = new MathNode("mstyle", [label]);
        label.setAttribute("displaystyle", "false");
        label.setAttribute("scriptlevel", "1");
        return label;
      }
    });
    defineFunction({
      type: "cdlabelparent",
      names: ["\\\\cdparent"],
      props: {
        numArgs: 1
      },
      handler(_ref2, args) {
        var {
          parser
        } = _ref2;
        return {
          type: "cdlabelparent",
          mode: parser.mode,
          fragment: args[0]
        };
      },
      htmlBuilder(group, options) {
        var parent = wrapFragment(buildGroup$1(group.fragment, options), options);
        parent.classes.push("cd-vert-arrow");
        return parent;
      },
      mathmlBuilder(group, options) {
        return new MathNode("mrow", [buildGroup2(group.fragment, options)]);
      }
    });
    defineFunction({
      type: "textord",
      names: ["\\@char"],
      props: {
        numArgs: 1,
        allowedInText: true
      },
      handler(_ref, args) {
        var {
          parser
        } = _ref;
        var arg = assertNodeType(args[0], "ordgroup");
        var group = arg.body;
        var number = "";
        for (var i = 0; i < group.length; i++) {
          var node = assertNodeType(group[i], "textord");
          number += node.text;
        }
        var code = parseInt(number);
        var text2;
        if (isNaN(code)) {
          throw new ParseError("\\@char has non-numeric argument " + number);
        } else if (code < 0 || code >= 1114111) {
          throw new ParseError("\\@char with invalid code point " + number);
        } else if (code <= 65535) {
          text2 = String.fromCharCode(code);
        } else {
          code -= 65536;
          text2 = String.fromCharCode((code >> 10) + 55296, (code & 1023) + 56320);
        }
        return {
          type: "textord",
          mode: parser.mode,
          text: text2
        };
      }
    });
    var htmlBuilder$8 = (group, options) => {
      var elements = buildExpression$1(group.body, options.withColor(group.color), false);
      return makeFragment(elements);
    };
    var mathmlBuilder$7 = (group, options) => {
      var inner2 = buildExpression2(group.body, options.withColor(group.color));
      var node = new MathNode("mstyle", inner2);
      node.setAttribute("mathcolor", group.color);
      return node;
    };
    defineFunction({
      type: "color",
      names: ["\\textcolor"],
      props: {
        numArgs: 2,
        allowedInText: true,
        argTypes: ["color", "original"]
      },
      handler(_ref, args) {
        var {
          parser
        } = _ref;
        var color = assertNodeType(args[0], "color-token").color;
        var body = args[1];
        return {
          type: "color",
          mode: parser.mode,
          color,
          body: ordargument(body)
        };
      },
      htmlBuilder: htmlBuilder$8,
      mathmlBuilder: mathmlBuilder$7
    });
    defineFunction({
      type: "color",
      names: ["\\color"],
      props: {
        numArgs: 1,
        allowedInText: true,
        argTypes: ["color"]
      },
      handler(_ref2, args) {
        var {
          parser,
          breakOnTokenText
        } = _ref2;
        var color = assertNodeType(args[0], "color-token").color;
        parser.gullet.macros.set("\\current@color", color);
        var body = parser.parseExpression(true, breakOnTokenText);
        return {
          type: "color",
          mode: parser.mode,
          color,
          body
        };
      },
      htmlBuilder: htmlBuilder$8,
      mathmlBuilder: mathmlBuilder$7
    });
    defineFunction({
      type: "cr",
      names: ["\\\\"],
      props: {
        numArgs: 0,
        numOptionalArgs: 0,
        allowedInText: true
      },
      handler(_ref, args, optArgs) {
        var {
          parser
        } = _ref;
        var size = parser.gullet.future().text === "[" ? parser.parseSizeGroup(true) : null;
        var newLine = !parser.settings.displayMode || !parser.settings.useStrictBehavior("newLineInDisplayMode", "In LaTeX, \\\\ or \\newline does nothing in display mode");
        return {
          type: "cr",
          mode: parser.mode,
          newLine,
          size: size && assertNodeType(size, "size").value
        };
      },
      // The following builders are called only at the top level,
      // not within tabular/array environments.
      htmlBuilder(group, options) {
        var span = makeSpan(["mspace"], [], options);
        if (group.newLine) {
          span.classes.push("newline");
          if (group.size) {
            span.style.marginTop = makeEm(calculateSize(group.size, options));
          }
        }
        return span;
      },
      mathmlBuilder(group, options) {
        var node = new MathNode("mspace");
        if (group.newLine) {
          node.setAttribute("linebreak", "newline");
          if (group.size) {
            node.setAttribute("height", makeEm(calculateSize(group.size, options)));
          }
        }
        return node;
      }
    });
    var globalMap = {
      "\\global": "\\global",
      "\\long": "\\\\globallong",
      "\\\\globallong": "\\\\globallong",
      "\\def": "\\gdef",
      "\\gdef": "\\gdef",
      "\\edef": "\\xdef",
      "\\xdef": "\\xdef",
      "\\let": "\\\\globallet",
      "\\futurelet": "\\\\globalfuture"
    };
    var checkControlSequence = (tok) => {
      var name2 = tok.text;
      if (/^(?:[\\{}$&#^_]|EOF)$/.test(name2)) {
        throw new ParseError("Expected a control sequence", tok);
      }
      return name2;
    };
    var getRHS = (parser) => {
      var tok = parser.gullet.popToken();
      if (tok.text === "=") {
        tok = parser.gullet.popToken();
        if (tok.text === " ") {
          tok = parser.gullet.popToken();
        }
      }
      return tok;
    };
    var letCommand = (parser, name2, tok, global) => {
      var macro = parser.gullet.macros.get(tok.text);
      if (macro == null) {
        tok.noexpand = true;
        macro = {
          tokens: [tok],
          numArgs: 0,
          // reproduce the same behavior in expansion
          unexpandable: !parser.gullet.isExpandable(tok.text)
        };
      }
      parser.gullet.macros.set(name2, macro, global);
    };
    defineFunction({
      type: "internal",
      names: [
        "\\global",
        "\\long",
        "\\\\globallong"
        // can’t be entered directly
      ],
      props: {
        numArgs: 0,
        allowedInText: true
      },
      handler(_ref) {
        var {
          parser,
          funcName
        } = _ref;
        parser.consumeSpaces();
        var token = parser.fetch();
        if (globalMap[token.text]) {
          if (funcName === "\\global" || funcName === "\\\\globallong") {
            token.text = globalMap[token.text];
          }
          return assertNodeType(parser.parseFunction(), "internal");
        }
        throw new ParseError("Invalid token after macro prefix", token);
      }
    });
    defineFunction({
      type: "internal",
      names: ["\\def", "\\gdef", "\\edef", "\\xdef"],
      props: {
        numArgs: 0,
        allowedInText: true,
        primitive: true
      },
      handler(_ref2) {
        var {
          parser,
          funcName
        } = _ref2;
        var tok = parser.gullet.popToken();
        var name2 = tok.text;
        if (/^(?:[\\{}$&#^_]|EOF)$/.test(name2)) {
          throw new ParseError("Expected a control sequence", tok);
        }
        var numArgs = 0;
        var insert;
        var delimiters2 = [[]];
        while (parser.gullet.future().text !== "{") {
          tok = parser.gullet.popToken();
          if (tok.text === "#") {
            if (parser.gullet.future().text === "{") {
              insert = parser.gullet.future();
              delimiters2[numArgs].push("{");
              break;
            }
            tok = parser.gullet.popToken();
            if (!/^[1-9]$/.test(tok.text)) {
              throw new ParseError('Invalid argument number "' + tok.text + '"');
            }
            if (parseInt(tok.text) !== numArgs + 1) {
              throw new ParseError('Argument number "' + tok.text + '" out of order');
            }
            numArgs++;
            delimiters2.push([]);
          } else if (tok.text === "EOF") {
            throw new ParseError("Expected a macro definition");
          } else {
            delimiters2[numArgs].push(tok.text);
          }
        }
        var {
          tokens
        } = parser.gullet.consumeArg();
        if (insert) {
          tokens.unshift(insert);
        }
        if (funcName === "\\edef" || funcName === "\\xdef") {
          tokens = parser.gullet.expandTokens(tokens);
          tokens.reverse();
        }
        parser.gullet.macros.set(name2, {
          tokens,
          numArgs,
          delimiters: delimiters2
        }, funcName === globalMap[funcName]);
        return {
          type: "internal",
          mode: parser.mode
        };
      }
    });
    defineFunction({
      type: "internal",
      names: [
        "\\let",
        "\\\\globallet"
        // can’t be entered directly
      ],
      props: {
        numArgs: 0,
        allowedInText: true,
        primitive: true
      },
      handler(_ref3) {
        var {
          parser,
          funcName
        } = _ref3;
        var name2 = checkControlSequence(parser.gullet.popToken());
        parser.gullet.consumeSpaces();
        var tok = getRHS(parser);
        letCommand(parser, name2, tok, funcName === "\\\\globallet");
        return {
          type: "internal",
          mode: parser.mode
        };
      }
    });
    defineFunction({
      type: "internal",
      names: [
        "\\futurelet",
        "\\\\globalfuture"
        // can’t be entered directly
      ],
      props: {
        numArgs: 0,
        allowedInText: true,
        primitive: true
      },
      handler(_ref4) {
        var {
          parser,
          funcName
        } = _ref4;
        var name2 = checkControlSequence(parser.gullet.popToken());
        var middle = parser.gullet.popToken();
        var tok = parser.gullet.popToken();
        letCommand(parser, name2, tok, funcName === "\\\\globalfuture");
        parser.gullet.pushToken(tok);
        parser.gullet.pushToken(middle);
        return {
          type: "internal",
          mode: parser.mode
        };
      }
    });
    var getMetrics = function getMetrics2(symbol, font, mode) {
      var replace = symbols.math[symbol] && symbols.math[symbol].replace;
      var metrics = getCharacterMetrics(replace || symbol, font, mode);
      if (!metrics) {
        throw new Error("Unsupported symbol " + symbol + " and font size " + font + ".");
      }
      return metrics;
    };
    var styleWrap = function styleWrap2(delim, toStyle, options, classes) {
      var newOptions = options.havingBaseStyle(toStyle);
      var span = makeSpan(classes.concat(newOptions.sizingClasses(options)), [delim], options);
      var delimSizeMultiplier = newOptions.sizeMultiplier / options.sizeMultiplier;
      span.height *= delimSizeMultiplier;
      span.depth *= delimSizeMultiplier;
      span.maxFontSize = newOptions.sizeMultiplier;
      return span;
    };
    var centerSpan = function centerSpan2(span, options, style) {
      var newOptions = options.havingBaseStyle(style);
      var shift = (1 - options.sizeMultiplier / newOptions.sizeMultiplier) * options.fontMetrics().axisHeight;
      span.classes.push("delimcenter");
      span.style.top = makeEm(shift);
      span.height -= shift;
      span.depth += shift;
    };
    var makeSmallDelim = function makeSmallDelim2(delim, style, center, options, mode, classes) {
      var text2 = makeSymbol(delim, "Main-Regular", mode, options);
      var span = styleWrap(text2, style, options, classes);
      if (center) {
        centerSpan(span, options, style);
      }
      return span;
    };
    var mathrmSize = function mathrmSize2(value, size, mode, options) {
      return makeSymbol(value, "Size" + size + "-Regular", mode, options);
    };
    var makeLargeDelim = function makeLargeDelim2(delim, size, center, options, mode, classes) {
      var inner2 = mathrmSize(delim, size, mode, options);
      var span = styleWrap(makeSpan(["delimsizing", "size" + size], [inner2], options), Style$1.TEXT, options, classes);
      if (center) {
        centerSpan(span, options, Style$1.TEXT);
      }
      return span;
    };
    var makeGlyphSpan = function makeGlyphSpan2(symbol, font, mode) {
      var sizeClass;
      if (font === "Size1-Regular") {
        sizeClass = "delim-size1";
      } else {
        sizeClass = "delim-size4";
      }
      var corner = makeSpan(["delimsizinginner", sizeClass], [makeSpan([], [makeSymbol(symbol, font, mode)])]);
      return {
        type: "elem",
        elem: corner
      };
    };
    var makeInner = function makeInner2(ch, height, options) {
      var width = fontMetricsData["Size4-Regular"][ch.charCodeAt(0)] ? fontMetricsData["Size4-Regular"][ch.charCodeAt(0)][4] : fontMetricsData["Size1-Regular"][ch.charCodeAt(0)][4];
      var path2 = new PathNode("inner", innerPath(ch, Math.round(1e3 * height)));
      var svgNode = new SvgNode([path2], {
        "width": makeEm(width),
        "height": makeEm(height),
        // Override CSS rule `.katex svg { width: 100% }`
        "style": "width:" + makeEm(width),
        "viewBox": "0 0 " + 1e3 * width + " " + Math.round(1e3 * height),
        "preserveAspectRatio": "xMinYMin"
      });
      var span = makeSvgSpan([], [svgNode], options);
      span.height = height;
      span.style.height = makeEm(height);
      span.style.width = makeEm(width);
      return {
        type: "elem",
        elem: span
      };
    };
    var lapInEms = 8e-3;
    var lap = {
      type: "kern",
      size: -1 * lapInEms
    };
    var verts = /* @__PURE__ */ new Set(["|", "\\lvert", "\\rvert", "\\vert"]);
    var doubleVerts = /* @__PURE__ */ new Set(["\\|", "\\lVert", "\\rVert", "\\Vert"]);
    var makeStackedDelim = function makeStackedDelim2(delim, heightTotal, center, options, mode, classes) {
      var top;
      var middle;
      var repeat;
      var bottom;
      var svgLabel = "";
      var viewBoxWidth = 0;
      top = repeat = bottom = delim;
      middle = null;
      var font = "Size1-Regular";
      if (delim === "\\uparrow") {
        repeat = bottom = "\u23D0";
      } else if (delim === "\\Uparrow") {
        repeat = bottom = "\u2016";
      } else if (delim === "\\downarrow") {
        top = repeat = "\u23D0";
      } else if (delim === "\\Downarrow") {
        top = repeat = "\u2016";
      } else if (delim === "\\updownarrow") {
        top = "\\uparrow";
        repeat = "\u23D0";
        bottom = "\\downarrow";
      } else if (delim === "\\Updownarrow") {
        top = "\\Uparrow";
        repeat = "\u2016";
        bottom = "\\Downarrow";
      } else if (verts.has(delim)) {
        repeat = "\u2223";
        svgLabel = "vert";
        viewBoxWidth = 333;
      } else if (doubleVerts.has(delim)) {
        repeat = "\u2225";
        svgLabel = "doublevert";
        viewBoxWidth = 556;
      } else if (delim === "[" || delim === "\\lbrack") {
        top = "\u23A1";
        repeat = "\u23A2";
        bottom = "\u23A3";
        font = "Size4-Regular";
        svgLabel = "lbrack";
        viewBoxWidth = 667;
      } else if (delim === "]" || delim === "\\rbrack") {
        top = "\u23A4";
        repeat = "\u23A5";
        bottom = "\u23A6";
        font = "Size4-Regular";
        svgLabel = "rbrack";
        viewBoxWidth = 667;
      } else if (delim === "\\lfloor" || delim === "\u230A") {
        repeat = top = "\u23A2";
        bottom = "\u23A3";
        font = "Size4-Regular";
        svgLabel = "lfloor";
        viewBoxWidth = 667;
      } else if (delim === "\\lceil" || delim === "\u2308") {
        top = "\u23A1";
        repeat = bottom = "\u23A2";
        font = "Size4-Regular";
        svgLabel = "lceil";
        viewBoxWidth = 667;
      } else if (delim === "\\rfloor" || delim === "\u230B") {
        repeat = top = "\u23A5";
        bottom = "\u23A6";
        font = "Size4-Regular";
        svgLabel = "rfloor";
        viewBoxWidth = 667;
      } else if (delim === "\\rceil" || delim === "\u2309") {
        top = "\u23A4";
        repeat = bottom = "\u23A5";
        font = "Size4-Regular";
        svgLabel = "rceil";
        viewBoxWidth = 667;
      } else if (delim === "(" || delim === "\\lparen") {
        top = "\u239B";
        repeat = "\u239C";
        bottom = "\u239D";
        font = "Size4-Regular";
        svgLabel = "lparen";
        viewBoxWidth = 875;
      } else if (delim === ")" || delim === "\\rparen") {
        top = "\u239E";
        repeat = "\u239F";
        bottom = "\u23A0";
        font = "Size4-Regular";
        svgLabel = "rparen";
        viewBoxWidth = 875;
      } else if (delim === "\\{" || delim === "\\lbrace") {
        top = "\u23A7";
        middle = "\u23A8";
        bottom = "\u23A9";
        repeat = "\u23AA";
        font = "Size4-Regular";
      } else if (delim === "\\}" || delim === "\\rbrace") {
        top = "\u23AB";
        middle = "\u23AC";
        bottom = "\u23AD";
        repeat = "\u23AA";
        font = "Size4-Regular";
      } else if (delim === "\\lgroup" || delim === "\u27EE") {
        top = "\u23A7";
        bottom = "\u23A9";
        repeat = "\u23AA";
        font = "Size4-Regular";
      } else if (delim === "\\rgroup" || delim === "\u27EF") {
        top = "\u23AB";
        bottom = "\u23AD";
        repeat = "\u23AA";
        font = "Size4-Regular";
      } else if (delim === "\\lmoustache" || delim === "\u23B0") {
        top = "\u23A7";
        bottom = "\u23AD";
        repeat = "\u23AA";
        font = "Size4-Regular";
      } else if (delim === "\\rmoustache" || delim === "\u23B1") {
        top = "\u23AB";
        bottom = "\u23A9";
        repeat = "\u23AA";
        font = "Size4-Regular";
      }
      var topMetrics = getMetrics(top, font, mode);
      var topHeightTotal = topMetrics.height + topMetrics.depth;
      var repeatMetrics = getMetrics(repeat, font, mode);
      var repeatHeightTotal = repeatMetrics.height + repeatMetrics.depth;
      var bottomMetrics = getMetrics(bottom, font, mode);
      var bottomHeightTotal = bottomMetrics.height + bottomMetrics.depth;
      var middleHeightTotal = 0;
      var middleFactor = 1;
      if (middle !== null) {
        var middleMetrics = getMetrics(middle, font, mode);
        middleHeightTotal = middleMetrics.height + middleMetrics.depth;
        middleFactor = 2;
      }
      var minHeight = topHeightTotal + bottomHeightTotal + middleHeightTotal;
      var repeatCount = Math.max(0, Math.ceil((heightTotal - minHeight) / (middleFactor * repeatHeightTotal)));
      var realHeightTotal = minHeight + repeatCount * middleFactor * repeatHeightTotal;
      var axisHeight = options.fontMetrics().axisHeight;
      if (center) {
        axisHeight *= options.sizeMultiplier;
      }
      var depth = realHeightTotal / 2 - axisHeight;
      var stack = [];
      if (svgLabel.length > 0) {
        var midHeight = realHeightTotal - topHeightTotal - bottomHeightTotal;
        var viewBoxHeight = Math.round(realHeightTotal * 1e3);
        var pathStr = tallDelim(svgLabel, Math.round(midHeight * 1e3));
        var path2 = new PathNode(svgLabel, pathStr);
        var width = makeEm(viewBoxWidth / 1e3);
        var height = makeEm(viewBoxHeight / 1e3);
        var svg = new SvgNode([path2], {
          "width": width,
          "height": height,
          "viewBox": "0 0 " + viewBoxWidth + " " + viewBoxHeight
        });
        var wrapper = makeSvgSpan([], [svg], options);
        wrapper.height = viewBoxHeight / 1e3;
        wrapper.style.width = width;
        wrapper.style.height = height;
        stack.push({
          type: "elem",
          elem: wrapper
        });
      } else {
        stack.push(makeGlyphSpan(bottom, font, mode));
        stack.push(lap);
        if (middle === null) {
          var innerHeight = realHeightTotal - topHeightTotal - bottomHeightTotal + 2 * lapInEms;
          stack.push(makeInner(repeat, innerHeight, options));
        } else {
          var _innerHeight = (realHeightTotal - topHeightTotal - bottomHeightTotal - middleHeightTotal) / 2 + 2 * lapInEms;
          stack.push(makeInner(repeat, _innerHeight, options));
          stack.push(lap);
          stack.push(makeGlyphSpan(middle, font, mode));
          stack.push(lap);
          stack.push(makeInner(repeat, _innerHeight, options));
        }
        stack.push(lap);
        stack.push(makeGlyphSpan(top, font, mode));
      }
      var newOptions = options.havingBaseStyle(Style$1.TEXT);
      var inner2 = makeVList({
        positionType: "bottom",
        positionData: depth,
        children: stack
      });
      return styleWrap(makeSpan(["delimsizing", "mult"], [inner2], newOptions), Style$1.TEXT, options, classes);
    };
    var vbPad = 80;
    var emPad = 0.08;
    var sqrtSvg = function sqrtSvg2(sqrtName, height, viewBoxHeight, extraVinculum, options) {
      var path2 = sqrtPath(sqrtName, extraVinculum, viewBoxHeight);
      var pathNode = new PathNode(sqrtName, path2);
      var svg = new SvgNode([pathNode], {
        // Note: 1000:1 ratio of viewBox to document em width.
        "width": "400em",
        "height": makeEm(height),
        "viewBox": "0 0 400000 " + viewBoxHeight,
        "preserveAspectRatio": "xMinYMin slice"
      });
      return makeSvgSpan(["hide-tail"], [svg], options);
    };
    var makeSqrtImage = function makeSqrtImage2(height, options) {
      var newOptions = options.havingBaseSizing();
      var delim = traverseSequence("\\surd", height * newOptions.sizeMultiplier, stackLargeDelimiterSequence, newOptions);
      var sizeMultiplier = newOptions.sizeMultiplier;
      var extraVinculum = Math.max(0, options.minRuleThickness - options.fontMetrics().sqrtRuleThickness);
      var span;
      var spanHeight;
      var texHeight;
      var viewBoxHeight;
      var advanceWidth;
      if (delim.type === "small") {
        viewBoxHeight = 1e3 + 1e3 * extraVinculum + vbPad;
        if (height < 1) {
          sizeMultiplier = 1;
        } else if (height < 1.4) {
          sizeMultiplier = 0.7;
        }
        spanHeight = (1 + extraVinculum + emPad) / sizeMultiplier;
        texHeight = (1 + extraVinculum) / sizeMultiplier;
        span = sqrtSvg("sqrtMain", spanHeight, viewBoxHeight, extraVinculum, options);
        span.style.minWidth = "0.853em";
        advanceWidth = 0.833 / sizeMultiplier;
      } else if (delim.type === "large") {
        viewBoxHeight = (1e3 + vbPad) * sizeToMaxHeight[delim.size];
        texHeight = (sizeToMaxHeight[delim.size] + extraVinculum) / sizeMultiplier;
        spanHeight = (sizeToMaxHeight[delim.size] + extraVinculum + emPad) / sizeMultiplier;
        span = sqrtSvg("sqrtSize" + delim.size, spanHeight, viewBoxHeight, extraVinculum, options);
        span.style.minWidth = "1.02em";
        advanceWidth = 1 / sizeMultiplier;
      } else {
        spanHeight = height + extraVinculum + emPad;
        texHeight = height + extraVinculum;
        viewBoxHeight = Math.floor(1e3 * height + extraVinculum) + vbPad;
        span = sqrtSvg("sqrtTall", spanHeight, viewBoxHeight, extraVinculum, options);
        span.style.minWidth = "0.742em";
        advanceWidth = 1.056;
      }
      span.height = texHeight;
      span.style.height = makeEm(spanHeight);
      return {
        span,
        advanceWidth,
        // Calculate the actual line width.
        // This actually should depend on the chosen font -- e.g. \boldmath
        // should use the thicker surd symbols from e.g. KaTeX_Main-Bold, and
        // have thicker rules.
        ruleWidth: (options.fontMetrics().sqrtRuleThickness + extraVinculum) * sizeMultiplier
      };
    };
    var stackLargeDelimiters = /* @__PURE__ */ new Set(["(", "\\lparen", ")", "\\rparen", "[", "\\lbrack", "]", "\\rbrack", "\\{", "\\lbrace", "\\}", "\\rbrace", "\\lfloor", "\\rfloor", "\u230A", "\u230B", "\\lceil", "\\rceil", "\u2308", "\u2309", "\\surd"]);
    var stackAlwaysDelimiters = /* @__PURE__ */ new Set(["\\uparrow", "\\downarrow", "\\updownarrow", "\\Uparrow", "\\Downarrow", "\\Updownarrow", "|", "\\|", "\\vert", "\\Vert", "\\lvert", "\\rvert", "\\lVert", "\\rVert", "\\lgroup", "\\rgroup", "\u27EE", "\u27EF", "\\lmoustache", "\\rmoustache", "\u23B0", "\u23B1"]);
    var stackNeverDelimiters = /* @__PURE__ */ new Set(["<", ">", "\\langle", "\\rangle", "/", "\\backslash", "\\lt", "\\gt"]);
    var sizeToMaxHeight = [0, 1.2, 1.8, 2.4, 3];
    var makeSizedDelim = function makeSizedDelim2(delim, size, options, mode, classes) {
      if (delim === "<" || delim === "\\lt" || delim === "\u27E8") {
        delim = "\\langle";
      } else if (delim === ">" || delim === "\\gt" || delim === "\u27E9") {
        delim = "\\rangle";
      }
      if (stackLargeDelimiters.has(delim) || stackNeverDelimiters.has(delim)) {
        return makeLargeDelim(delim, size, false, options, mode, classes);
      } else if (stackAlwaysDelimiters.has(delim)) {
        return makeStackedDelim(delim, sizeToMaxHeight[size], false, options, mode, classes);
      } else {
        throw new ParseError("Illegal delimiter: '" + delim + "'");
      }
    };
    var stackNeverDelimiterSequence = [{
      type: "small",
      style: Style$1.SCRIPTSCRIPT
    }, {
      type: "small",
      style: Style$1.SCRIPT
    }, {
      type: "small",
      style: Style$1.TEXT
    }, {
      type: "large",
      size: 1
    }, {
      type: "large",
      size: 2
    }, {
      type: "large",
      size: 3
    }, {
      type: "large",
      size: 4
    }];
    var stackAlwaysDelimiterSequence = [{
      type: "small",
      style: Style$1.SCRIPTSCRIPT
    }, {
      type: "small",
      style: Style$1.SCRIPT
    }, {
      type: "small",
      style: Style$1.TEXT
    }, {
      type: "stack"
    }];
    var stackLargeDelimiterSequence = [{
      type: "small",
      style: Style$1.SCRIPTSCRIPT
    }, {
      type: "small",
      style: Style$1.SCRIPT
    }, {
      type: "small",
      style: Style$1.TEXT
    }, {
      type: "large",
      size: 1
    }, {
      type: "large",
      size: 2
    }, {
      type: "large",
      size: 3
    }, {
      type: "large",
      size: 4
    }, {
      type: "stack"
    }];
    var delimTypeToFont = function delimTypeToFont2(type) {
      if (type.type === "small") {
        return "Main-Regular";
      } else if (type.type === "large") {
        return "Size" + type.size + "-Regular";
      } else if (type.type === "stack") {
        return "Size4-Regular";
      } else {
        var delimKind = type.type;
        throw new Error("Add support for delim type '" + delimKind + "' here.");
      }
    };
    var traverseSequence = function traverseSequence2(delim, height, sequence, options) {
      var start = Math.min(2, 3 - options.style.size);
      for (var i = start; i < sequence.length; i++) {
        var delimType = sequence[i];
        if (delimType.type === "stack") {
          break;
        }
        var metrics = getMetrics(delim, delimTypeToFont(delimType), "math");
        var heightDepth = metrics.height + metrics.depth;
        if (delimType.type === "small") {
          var newOptions = options.havingBaseStyle(delimType.style);
          heightDepth *= newOptions.sizeMultiplier;
        }
        if (heightDepth > height) {
          return delimType;
        }
      }
      return sequence[sequence.length - 1];
    };
    var makeCustomSizedDelim = function makeCustomSizedDelim2(delim, height, center, options, mode, classes) {
      if (delim === "<" || delim === "\\lt" || delim === "\u27E8") {
        delim = "\\langle";
      } else if (delim === ">" || delim === "\\gt" || delim === "\u27E9") {
        delim = "\\rangle";
      }
      var sequence;
      if (stackNeverDelimiters.has(delim)) {
        sequence = stackNeverDelimiterSequence;
      } else if (stackLargeDelimiters.has(delim)) {
        sequence = stackLargeDelimiterSequence;
      } else {
        sequence = stackAlwaysDelimiterSequence;
      }
      var delimType = traverseSequence(delim, height, sequence, options);
      if (delimType.type === "small") {
        return makeSmallDelim(delim, delimType.style, center, options, mode, classes);
      } else if (delimType.type === "large") {
        return makeLargeDelim(delim, delimType.size, center, options, mode, classes);
      } else {
        return makeStackedDelim(delim, height, center, options, mode, classes);
      }
    };
    var makeLeftRightDelim = function makeLeftRightDelim2(delim, height, depth, options, mode, classes) {
      var axisHeight = options.fontMetrics().axisHeight * options.sizeMultiplier;
      var delimiterFactor = 901;
      var delimiterExtend = 5 / options.fontMetrics().ptPerEm;
      var maxDistFromAxis = Math.max(height - axisHeight, depth + axisHeight);
      var totalHeight = Math.max(
        // In real TeX, calculations are done using integral values which are
        // 65536 per pt, or 655360 per em. So, the division here truncates in
        // TeX but doesn't here, producing different results. If we wanted to
        // exactly match TeX's calculation, we could do
        //   Math.floor(655360 * maxDistFromAxis / 500) *
        //    delimiterFactor / 655360
        // (To see the difference, compare
        //    x^{x^{\left(\rule{0.1em}{0.68em}\right)}}
        // in TeX and KaTeX)
        maxDistFromAxis / 500 * delimiterFactor,
        2 * maxDistFromAxis - delimiterExtend
      );
      return makeCustomSizedDelim(delim, totalHeight, true, options, mode, classes);
    };
    var delimiterSizes = {
      "\\bigl": {
        mclass: "mopen",
        size: 1
      },
      "\\Bigl": {
        mclass: "mopen",
        size: 2
      },
      "\\biggl": {
        mclass: "mopen",
        size: 3
      },
      "\\Biggl": {
        mclass: "mopen",
        size: 4
      },
      "\\bigr": {
        mclass: "mclose",
        size: 1
      },
      "\\Bigr": {
        mclass: "mclose",
        size: 2
      },
      "\\biggr": {
        mclass: "mclose",
        size: 3
      },
      "\\Biggr": {
        mclass: "mclose",
        size: 4
      },
      "\\bigm": {
        mclass: "mrel",
        size: 1
      },
      "\\Bigm": {
        mclass: "mrel",
        size: 2
      },
      "\\biggm": {
        mclass: "mrel",
        size: 3
      },
      "\\Biggm": {
        mclass: "mrel",
        size: 4
      },
      "\\big": {
        mclass: "mord",
        size: 1
      },
      "\\Big": {
        mclass: "mord",
        size: 2
      },
      "\\bigg": {
        mclass: "mord",
        size: 3
      },
      "\\Bigg": {
        mclass: "mord",
        size: 4
      }
    };
    var delimiters = /* @__PURE__ */ new Set(["(", "\\lparen", ")", "\\rparen", "[", "\\lbrack", "]", "\\rbrack", "\\{", "\\lbrace", "\\}", "\\rbrace", "\\lfloor", "\\rfloor", "\u230A", "\u230B", "\\lceil", "\\rceil", "\u2308", "\u2309", "<", ">", "\\langle", "\u27E8", "\\rangle", "\u27E9", "\\lt", "\\gt", "\\lvert", "\\rvert", "\\lVert", "\\rVert", "\\lgroup", "\\rgroup", "\u27EE", "\u27EF", "\\lmoustache", "\\rmoustache", "\u23B0", "\u23B1", "/", "\\backslash", "|", "\\vert", "\\|", "\\Vert", "\\uparrow", "\\Uparrow", "\\downarrow", "\\Downarrow", "\\updownarrow", "\\Updownarrow", "."]);
    function isMiddleDelimNode(node) {
      return "isMiddle" in node;
    }
    function checkDelimiter(delim, context) {
      var symDelim = checkSymbolNodeType(delim);
      if (symDelim && delimiters.has(symDelim.text)) {
        return symDelim;
      } else if (symDelim) {
        throw new ParseError("Invalid delimiter '" + symDelim.text + "' after '" + context.funcName + "'", delim);
      } else {
        throw new ParseError("Invalid delimiter type '" + delim.type + "'", delim);
      }
    }
    defineFunction({
      type: "delimsizing",
      names: ["\\bigl", "\\Bigl", "\\biggl", "\\Biggl", "\\bigr", "\\Bigr", "\\biggr", "\\Biggr", "\\bigm", "\\Bigm", "\\biggm", "\\Biggm", "\\big", "\\Big", "\\bigg", "\\Bigg"],
      props: {
        numArgs: 1,
        argTypes: ["primitive"]
      },
      handler: (context, args) => {
        var delim = checkDelimiter(args[0], context);
        return {
          type: "delimsizing",
          mode: context.parser.mode,
          size: delimiterSizes[context.funcName].size,
          mclass: delimiterSizes[context.funcName].mclass,
          delim: delim.text
        };
      },
      htmlBuilder: (group, options) => {
        if (group.delim === ".") {
          return makeSpan([group.mclass]);
        }
        return makeSizedDelim(group.delim, group.size, options, group.mode, [group.mclass]);
      },
      mathmlBuilder: (group) => {
        var children = [];
        if (group.delim !== ".") {
          children.push(makeText(group.delim, group.mode));
        }
        var node = new MathNode("mo", children);
        if (group.mclass === "mopen" || group.mclass === "mclose") {
          node.setAttribute("fence", "true");
        } else {
          node.setAttribute("fence", "false");
        }
        node.setAttribute("stretchy", "true");
        var size = makeEm(sizeToMaxHeight[group.size]);
        node.setAttribute("minsize", size);
        node.setAttribute("maxsize", size);
        return node;
      }
    });
    function assertParsed(group) {
      if (!group.body) {
        throw new Error("Bug: The leftright ParseNode wasn't fully parsed.");
      }
    }
    defineFunction({
      type: "leftright-right",
      names: ["\\right"],
      props: {
        numArgs: 1,
        primitive: true
      },
      handler: (context, args) => {
        var color = context.parser.gullet.macros.get("\\current@color");
        if (color && typeof color !== "string") {
          throw new ParseError("\\current@color set to non-string in \\right");
        }
        return {
          type: "leftright-right",
          mode: context.parser.mode,
          delim: checkDelimiter(args[0], context).text,
          color
          // undefined if not set via \color
        };
      }
    });
    defineFunction({
      type: "leftright",
      names: ["\\left"],
      props: {
        numArgs: 1,
        primitive: true
      },
      handler: (context, args) => {
        var delim = checkDelimiter(args[0], context);
        var parser = context.parser;
        ++parser.leftrightDepth;
        var body = parser.parseExpression(false);
        --parser.leftrightDepth;
        parser.expect("\\right", false);
        var right = assertNodeType(parser.parseFunction(), "leftright-right");
        return {
          type: "leftright",
          mode: parser.mode,
          body,
          left: delim.text,
          right: right.delim,
          rightColor: right.color
        };
      },
      htmlBuilder: (group, options) => {
        assertParsed(group);
        var inner2 = buildExpression$1(group.body, options, true, ["mopen", "mclose"]);
        var innerHeight = 0;
        var innerDepth = 0;
        var hadMiddle = false;
        for (var i = 0; i < inner2.length; i++) {
          var node = inner2[i];
          if (isMiddleDelimNode(node)) {
            hadMiddle = true;
          } else {
            innerHeight = Math.max(inner2[i].height, innerHeight);
            innerDepth = Math.max(inner2[i].depth, innerDepth);
          }
        }
        innerHeight *= options.sizeMultiplier;
        innerDepth *= options.sizeMultiplier;
        var leftDelim;
        if (group.left === ".") {
          leftDelim = makeNullDelimiter(options, ["mopen"]);
        } else {
          leftDelim = makeLeftRightDelim(group.left, innerHeight, innerDepth, options, group.mode, ["mopen"]);
        }
        inner2.unshift(leftDelim);
        if (hadMiddle) {
          for (var _i = 1; _i < inner2.length; _i++) {
            var middleDelim = inner2[_i];
            if (isMiddleDelimNode(middleDelim)) {
              var isMiddle = middleDelim.isMiddle;
              inner2[_i] = makeLeftRightDelim(isMiddle.delim, innerHeight, innerDepth, isMiddle.options, group.mode, []);
            }
          }
        }
        var rightDelim;
        if (group.right === ".") {
          rightDelim = makeNullDelimiter(options, ["mclose"]);
        } else {
          var colorOptions = group.rightColor ? options.withColor(group.rightColor) : options;
          rightDelim = makeLeftRightDelim(group.right, innerHeight, innerDepth, colorOptions, group.mode, ["mclose"]);
        }
        inner2.push(rightDelim);
        return makeSpan(["minner"], inner2, options);
      },
      mathmlBuilder: (group, options) => {
        assertParsed(group);
        var inner2 = buildExpression2(group.body, options);
        if (group.left !== ".") {
          var leftNode = new MathNode("mo", [makeText(group.left, group.mode)]);
          leftNode.setAttribute("fence", "true");
          inner2.unshift(leftNode);
        }
        if (group.right !== ".") {
          var rightNode = new MathNode("mo", [makeText(group.right, group.mode)]);
          rightNode.setAttribute("fence", "true");
          if (group.rightColor) {
            rightNode.setAttribute("mathcolor", group.rightColor);
          }
          inner2.push(rightNode);
        }
        return makeRow(inner2);
      }
    });
    defineFunction({
      type: "middle",
      names: ["\\middle"],
      props: {
        numArgs: 1,
        primitive: true
      },
      handler: (context, args) => {
        var delim = checkDelimiter(args[0], context);
        if (!context.parser.leftrightDepth) {
          throw new ParseError("\\middle without preceding \\left", delim);
        }
        return {
          type: "middle",
          mode: context.parser.mode,
          delim: delim.text
        };
      },
      htmlBuilder: (group, options) => {
        var middleDelim;
        if (group.delim === ".") {
          middleDelim = makeNullDelimiter(options, []);
        } else {
          middleDelim = makeSizedDelim(group.delim, 1, options, group.mode, []);
          middleDelim.isMiddle = {
            delim: group.delim,
            options
          };
        }
        return middleDelim;
      },
      mathmlBuilder: (group, options) => {
        var textNode = group.delim === "\\vert" || group.delim === "|" ? makeText("|", "text") : makeText(group.delim, group.mode);
        var middleNode = new MathNode("mo", [textNode]);
        middleNode.setAttribute("fence", "true");
        middleNode.setAttribute("lspace", "0.05em");
        middleNode.setAttribute("rspace", "0.05em");
        return middleNode;
      }
    });
    var htmlBuilder$7 = (group, options) => {
      var inner2 = wrapFragment(buildGroup$1(group.body, options), options);
      var label = group.label.slice(1);
      var scale = options.sizeMultiplier;
      var img;
      var imgShift;
      var isSingleChar = isCharacterBox(group.body);
      if (label === "sout") {
        img = makeSpan(["stretchy", "sout"]);
        img.height = options.fontMetrics().defaultRuleThickness / scale;
        imgShift = -0.5 * options.fontMetrics().xHeight;
      } else if (label === "phase") {
        var lineWeight = calculateSize({
          number: 0.6,
          unit: "pt"
        }, options);
        var clearance = calculateSize({
          number: 0.35,
          unit: "ex"
        }, options);
        var newOptions = options.havingBaseSizing();
        scale = scale / newOptions.sizeMultiplier;
        var angleHeight = inner2.height + inner2.depth + lineWeight + clearance;
        inner2.style.paddingLeft = makeEm(angleHeight / 2 + lineWeight);
        var viewBoxHeight = Math.floor(1e3 * angleHeight * scale);
        var path2 = phasePath(viewBoxHeight);
        var svgNode = new SvgNode([new PathNode("phase", path2)], {
          "width": "400em",
          "height": makeEm(viewBoxHeight / 1e3),
          "viewBox": "0 0 400000 " + viewBoxHeight,
          "preserveAspectRatio": "xMinYMin slice"
        });
        img = makeSvgSpan(["hide-tail"], [svgNode], options);
        img.style.height = makeEm(angleHeight);
        imgShift = inner2.depth + lineWeight + clearance;
      } else {
        if (/cancel/.test(label)) {
          if (!isSingleChar) {
            inner2.classes.push("cancel-pad");
          }
        } else if (label === "angl") {
          inner2.classes.push("anglpad");
        } else {
          inner2.classes.push("boxpad");
        }
        var topPad;
        var bottomPad;
        var ruleThickness = 0;
        if (/box/.test(label)) {
          ruleThickness = Math.max(
            options.fontMetrics().fboxrule,
            // default
            options.minRuleThickness
          );
          topPad = options.fontMetrics().fboxsep + (label === "colorbox" ? 0 : ruleThickness);
          bottomPad = topPad;
        } else if (label === "angl") {
          ruleThickness = Math.max(options.fontMetrics().defaultRuleThickness, options.minRuleThickness);
          topPad = 4 * ruleThickness;
          bottomPad = Math.max(0, 0.25 - inner2.depth);
        } else {
          topPad = isSingleChar ? 0.2 : 0;
          bottomPad = topPad;
        }
        img = stretchyEnclose(inner2, label, topPad, bottomPad, options);
        if (/fbox|boxed|fcolorbox/.test(label)) {
          img.style.borderStyle = "solid";
          img.style.borderWidth = makeEm(ruleThickness);
        } else if (label === "angl" && ruleThickness !== 0.049) {
          img.style.borderTopWidth = makeEm(ruleThickness);
          img.style.borderRightWidth = makeEm(ruleThickness);
        }
        imgShift = inner2.depth + bottomPad;
        if (group.backgroundColor) {
          img.style.backgroundColor = group.backgroundColor;
          if (group.borderColor) {
            img.style.borderColor = group.borderColor;
          }
        }
      }
      var vlist;
      if (group.backgroundColor) {
        vlist = makeVList({
          positionType: "individualShift",
          children: [
            // Put the color background behind inner;
            {
              type: "elem",
              elem: img,
              shift: imgShift
            },
            {
              type: "elem",
              elem: inner2,
              shift: 0
            }
          ]
        });
      } else {
        var classes = /cancel|phase/.test(label) ? ["svg-align"] : [];
        vlist = makeVList({
          positionType: "individualShift",
          children: [
            // Write the \cancel stroke on top of inner.
            {
              type: "elem",
              elem: inner2,
              shift: 0
            },
            {
              type: "elem",
              elem: img,
              shift: imgShift,
              wrapperClasses: classes
            }
          ]
        });
      }
      if (/cancel/.test(label)) {
        vlist.height = inner2.height;
        vlist.depth = inner2.depth;
      }
      if (/cancel/.test(label) && !isSingleChar) {
        return makeSpan(["mord", "cancel-lap"], [vlist], options);
      } else {
        return makeSpan(["mord"], [vlist], options);
      }
    };
    var mathmlBuilder$6 = (group, options) => {
      var fboxsep;
      var node = new MathNode(group.label.includes("colorbox") ? "mpadded" : "menclose", [buildGroup2(group.body, options)]);
      switch (group.label) {
        case "\\cancel":
          node.setAttribute("notation", "updiagonalstrike");
          break;
        case "\\bcancel":
          node.setAttribute("notation", "downdiagonalstrike");
          break;
        case "\\phase":
          node.setAttribute("notation", "phasorangle");
          break;
        case "\\sout":
          node.setAttribute("notation", "horizontalstrike");
          break;
        case "\\fbox":
          node.setAttribute("notation", "box");
          break;
        case "\\angl":
          node.setAttribute("notation", "actuarial");
          break;
        case "\\fcolorbox":
        case "\\colorbox":
          fboxsep = options.fontMetrics().fboxsep * options.fontMetrics().ptPerEm;
          node.setAttribute("width", "+" + 2 * fboxsep + "pt");
          node.setAttribute("height", "+" + 2 * fboxsep + "pt");
          node.setAttribute("lspace", fboxsep + "pt");
          node.setAttribute("voffset", fboxsep + "pt");
          if (group.label === "\\fcolorbox") {
            var thk = Math.max(
              options.fontMetrics().fboxrule,
              // default
              options.minRuleThickness
            );
            node.setAttribute("style", "border: " + makeEm(thk) + " solid " + group.borderColor);
          }
          break;
        case "\\xcancel":
          node.setAttribute("notation", "updiagonalstrike downdiagonalstrike");
          break;
      }
      if (group.backgroundColor) {
        node.setAttribute("mathbackground", group.backgroundColor);
      }
      return node;
    };
    defineFunction({
      type: "enclose",
      names: ["\\colorbox"],
      props: {
        numArgs: 2,
        allowedInText: true,
        argTypes: ["color", "hbox"]
      },
      handler(_ref, args, optArgs) {
        var {
          parser,
          funcName
        } = _ref;
        var color = assertNodeType(args[0], "color-token").color;
        var body = args[1];
        return {
          type: "enclose",
          mode: parser.mode,
          label: funcName,
          backgroundColor: color,
          body
        };
      },
      htmlBuilder: htmlBuilder$7,
      mathmlBuilder: mathmlBuilder$6
    });
    defineFunction({
      type: "enclose",
      names: ["\\fcolorbox"],
      props: {
        numArgs: 3,
        allowedInText: true,
        argTypes: ["color", "color", "hbox"]
      },
      handler(_ref2, args, optArgs) {
        var {
          parser,
          funcName
        } = _ref2;
        var borderColor = assertNodeType(args[0], "color-token").color;
        var backgroundColor = assertNodeType(args[1], "color-token").color;
        var body = args[2];
        return {
          type: "enclose",
          mode: parser.mode,
          label: funcName,
          backgroundColor,
          borderColor,
          body
        };
      },
      htmlBuilder: htmlBuilder$7,
      mathmlBuilder: mathmlBuilder$6
    });
    defineFunction({
      type: "enclose",
      names: ["\\fbox"],
      props: {
        numArgs: 1,
        argTypes: ["hbox"],
        allowedInText: true
      },
      handler(_ref3, args) {
        var {
          parser
        } = _ref3;
        return {
          type: "enclose",
          mode: parser.mode,
          label: "\\fbox",
          body: args[0]
        };
      }
    });
    defineFunction({
      type: "enclose",
      names: ["\\cancel", "\\bcancel", "\\xcancel", "\\phase"],
      props: {
        numArgs: 1
      },
      handler(_ref4, args) {
        var {
          parser,
          funcName
        } = _ref4;
        var body = args[0];
        return {
          type: "enclose",
          mode: parser.mode,
          label: funcName,
          body
        };
      },
      htmlBuilder: htmlBuilder$7,
      mathmlBuilder: mathmlBuilder$6
    });
    defineFunction({
      type: "enclose",
      names: ["\\sout"],
      props: {
        numArgs: 1,
        allowedInText: true
      },
      handler(_ref5, args) {
        var {
          parser,
          funcName
        } = _ref5;
        if (parser.mode === "math") {
          parser.settings.reportNonstrict("mathVsSout", "LaTeX's \\sout works only in text mode");
        }
        var body = args[0];
        return {
          type: "enclose",
          mode: parser.mode,
          label: funcName,
          body
        };
      },
      htmlBuilder: htmlBuilder$7,
      mathmlBuilder: mathmlBuilder$6
    });
    defineFunction({
      type: "enclose",
      names: ["\\angl"],
      props: {
        numArgs: 1,
        argTypes: ["hbox"],
        allowedInText: false
      },
      handler(_ref6, args) {
        var {
          parser
        } = _ref6;
        return {
          type: "enclose",
          mode: parser.mode,
          label: "\\angl",
          body: args[0]
        };
      }
    });
    var _environments = {};
    function defineEnvironment(_ref) {
      var {
        type,
        names,
        props,
        handler,
        htmlBuilder: htmlBuilder3,
        mathmlBuilder: mathmlBuilder3
      } = _ref;
      var data = {
        type,
        numArgs: props.numArgs || 0,
        allowedInText: false,
        numOptionalArgs: 0,
        handler
      };
      for (var i = 0; i < names.length; ++i) {
        _environments[names[i]] = data;
      }
      if (htmlBuilder3) {
        _htmlGroupBuilders[type] = htmlBuilder3;
      }
      if (mathmlBuilder3) {
        _mathmlGroupBuilders[type] = mathmlBuilder3;
      }
    }
    var _macros = {};
    function defineMacro(name2, body) {
      _macros[name2] = body;
    }
    var SourceLocation = class _SourceLocation {
      // End offset, zero-based exclusive.
      constructor(lexer, start, end) {
        this.lexer = void 0;
        this.start = void 0;
        this.end = void 0;
        this.lexer = lexer;
        this.start = start;
        this.end = end;
      }
      /**
       * Merges two `SourceLocation`s from location providers, given they are
       * provided in order of appearance.
       * - Returns the first one's location if only the first is provided.
       * - Returns a merged range of the first and the last if both are provided
       *   and their lexers match.
       * - Otherwise, returns null.
       */
      static range(first, second) {
        if (!second) {
          return first && first.loc;
        } else if (!first || !first.loc || !second.loc || first.loc.lexer !== second.loc.lexer) {
          return null;
        } else {
          return new _SourceLocation(first.loc.lexer, first.loc.start, second.loc.end);
        }
      }
    };
    var Token = class _Token {
      // used in \noexpand
      constructor(text2, loc) {
        this.text = void 0;
        this.loc = void 0;
        this.noexpand = void 0;
        this.treatAsRelax = void 0;
        this.text = text2;
        this.loc = loc;
      }
      /**
       * Given a pair of tokens (this and endToken), compute a `Token` encompassing
       * the whole input range enclosed by these two.
       */
      range(endToken, text2) {
        return new _Token(text2, SourceLocation.range(this, endToken));
      }
    };
    function getHLines(parser) {
      var hlineInfo = [];
      parser.consumeSpaces();
      var nxt = parser.fetch().text;
      if (nxt === "\\relax") {
        parser.consume();
        parser.consumeSpaces();
        nxt = parser.fetch().text;
      }
      while (nxt === "\\hline" || nxt === "\\hdashline") {
        parser.consume();
        hlineInfo.push(nxt === "\\hdashline");
        parser.consumeSpaces();
        nxt = parser.fetch().text;
      }
      return hlineInfo;
    }
    var validateAmsEnvironmentContext = (context) => {
      var settings = context.parser.settings;
      if (!settings.displayMode) {
        throw new ParseError("{" + context.envName + "} can be used only in display mode.");
      }
    };
    var gatherEnvironments = /* @__PURE__ */ new Set(["gather", "gather*"]);
    function getAutoTag(name2) {
      if (!name2.includes("ed")) {
        return !name2.includes("*");
      }
    }
    function parseArray(parser, _ref, style) {
      var {
        hskipBeforeAndAfter,
        addJot,
        cols,
        arraystretch,
        colSeparationType,
        autoTag,
        singleRow,
        emptySingleRow,
        maxNumCols,
        leqno
      } = _ref;
      parser.gullet.beginGroup();
      if (!singleRow) {
        parser.gullet.macros.set("\\cr", "\\\\\\relax");
      }
      if (!arraystretch) {
        var stretch = parser.gullet.expandMacroAsText("\\arraystretch");
        if (stretch == null) {
          arraystretch = 1;
        } else {
          arraystretch = parseFloat(stretch);
          if (!arraystretch || arraystretch < 0) {
            throw new ParseError("Invalid \\arraystretch: " + stretch);
          }
        }
      }
      parser.gullet.beginGroup();
      var row = [];
      var body = [row];
      var rowGaps = [];
      var hLinesBeforeRow = [];
      var tags = autoTag != null ? [] : void 0;
      function beginRow() {
        if (autoTag) {
          parser.gullet.macros.set("\\@eqnsw", "1", true);
        }
      }
      function endRow() {
        if (tags) {
          if (parser.gullet.macros.get("\\df@tag")) {
            tags.push(parser.subparse([new Token("\\df@tag")]));
            parser.gullet.macros.set("\\df@tag", void 0, true);
          } else {
            tags.push(Boolean(autoTag) && parser.gullet.macros.get("\\@eqnsw") === "1");
          }
        }
      }
      beginRow();
      hLinesBeforeRow.push(getHLines(parser));
      while (true) {
        var cellBody = parser.parseExpression(false, singleRow ? "\\end" : "\\\\");
        parser.gullet.endGroup();
        parser.gullet.beginGroup();
        var cell = {
          type: "ordgroup",
          mode: parser.mode,
          body: cellBody
        };
        if (style) {
          cell = {
            type: "styling",
            mode: parser.mode,
            style,
            resetFont: true,
            body: [cell]
          };
        }
        row.push(cell);
        var next = parser.fetch().text;
        if (next === "&") {
          if (maxNumCols && row.length === maxNumCols) {
            if (singleRow || colSeparationType) {
              throw new ParseError("Too many tab characters: &", parser.nextToken);
            } else {
              parser.settings.reportNonstrict("textEnv", "Too few columns specified in the {array} column argument.");
            }
          }
          parser.consume();
        } else if (next === "\\end") {
          endRow();
          if (row.length === 1 && cell.type === "styling" && cell.body.length === 1 && cell.body[0].type === "ordgroup" && cell.body[0].body.length === 0 && (body.length > 1 || !emptySingleRow)) {
            body.pop();
          }
          if (hLinesBeforeRow.length < body.length + 1) {
            hLinesBeforeRow.push([]);
          }
          break;
        } else if (next === "\\\\") {
          parser.consume();
          var size = void 0;
          if (parser.gullet.future().text !== " ") {
            size = parser.parseSizeGroup(true);
          }
          rowGaps.push(size ? size.value : null);
          endRow();
          hLinesBeforeRow.push(getHLines(parser));
          row = [];
          body.push(row);
          beginRow();
        } else {
          throw new ParseError("Expected & or \\\\ or \\cr or \\end", parser.nextToken);
        }
      }
      parser.gullet.endGroup();
      parser.gullet.endGroup();
      return {
        type: "array",
        mode: parser.mode,
        addJot,
        arraystretch,
        body,
        cols,
        rowGaps,
        hskipBeforeAndAfter,
        hLinesBeforeRow,
        colSeparationType,
        tags,
        leqno
      };
    }
    function dCellStyle(envName) {
      if (envName.slice(0, 1) === "d") {
        return "display";
      } else {
        return "text";
      }
    }
    var htmlBuilder$6 = function htmlBuilder(group, options) {
      var r;
      var c;
      var nr = group.body.length;
      var hLinesBeforeRow = group.hLinesBeforeRow;
      var nc = 0;
      var body = new Array(nr);
      var hlines = [];
      var ruleThickness = Math.max(
        // From LaTeX \showthe\arrayrulewidth. Equals 0.04 em.
        options.fontMetrics().arrayRuleWidth,
        options.minRuleThickness
      );
      var pt = 1 / options.fontMetrics().ptPerEm;
      var arraycolsep = 5 * pt;
      if (group.colSeparationType && group.colSeparationType === "small") {
        var localMultiplier = options.havingStyle(Style$1.SCRIPT).sizeMultiplier;
        arraycolsep = 0.2778 * (localMultiplier / options.sizeMultiplier);
      }
      var baselineskip = group.colSeparationType === "CD" ? calculateSize({
        number: 3,
        unit: "ex"
      }, options) : 12 * pt;
      var jot = 3 * pt;
      var arrayskip = group.arraystretch * baselineskip;
      var arstrutHeight = 0.7 * arrayskip;
      var arstrutDepth = 0.3 * arrayskip;
      var totalHeight = 0;
      function setHLinePos(hlinesInGap) {
        for (var i = 0; i < hlinesInGap.length; ++i) {
          if (i > 0) {
            totalHeight += 0.25;
          }
          hlines.push({
            pos: totalHeight,
            isDashed: hlinesInGap[i]
          });
        }
      }
      setHLinePos(hLinesBeforeRow[0]);
      for (r = 0; r < group.body.length; ++r) {
        var inrow = group.body[r];
        var height = arstrutHeight;
        var depth = arstrutDepth;
        if (nc < inrow.length) {
          nc = inrow.length;
        }
        var outrow = {
          cells: new Array(inrow.length),
          height: 0,
          depth: 0,
          pos: 0
        };
        for (c = 0; c < inrow.length; ++c) {
          var elt = buildGroup$1(inrow[c], options);
          if (depth < elt.depth) {
            depth = elt.depth;
          }
          if (height < elt.height) {
            height = elt.height;
          }
          outrow.cells[c] = elt;
        }
        var rowGap = group.rowGaps[r];
        var gap = 0;
        if (rowGap) {
          gap = calculateSize(rowGap, options);
          if (gap > 0) {
            gap += arstrutDepth;
            if (depth < gap) {
              depth = gap;
            }
            gap = 0;
          }
        }
        if (group.addJot && r < group.body.length - 1) {
          depth += jot;
        }
        outrow.height = height;
        outrow.depth = depth;
        totalHeight += height;
        outrow.pos = totalHeight;
        totalHeight += depth + gap;
        body[r] = outrow;
        setHLinePos(hLinesBeforeRow[r + 1]);
      }
      var offset = totalHeight / 2 + options.fontMetrics().axisHeight;
      var colDescriptions = group.cols || [];
      var cols = [];
      var colSep;
      var colDescrNum;
      var tagSpans = [];
      if (group.tags && group.tags.some((tag2) => tag2)) {
        for (r = 0; r < nr; ++r) {
          var rw = body[r];
          var shift = rw.pos - offset;
          var tag = group.tags[r];
          var tagSpan = void 0;
          if (tag === true) {
            tagSpan = makeSpan(["eqn-num"], [], options);
          } else if (tag === false) {
            tagSpan = makeSpan([], [], options);
          } else {
            tagSpan = makeSpan([], buildExpression$1(tag, options, true), options);
          }
          tagSpan.depth = rw.depth;
          tagSpan.height = rw.height;
          tagSpans.push({
            type: "elem",
            elem: tagSpan,
            shift
          });
        }
      }
      for (
        c = 0, colDescrNum = 0;
        // Continue while either there are more columns or more column
        // descriptions, so trailing separators don't get lost.
        c < nc || colDescrNum < colDescriptions.length;
        ++c, ++colDescrNum
      ) {
        var _colDescr3;
        var colDescr = colDescriptions[colDescrNum];
        var firstSeparator = true;
        while (((_colDescr = colDescr) == null ? void 0 : _colDescr.type) === "separator") {
          var _colDescr;
          if (!firstSeparator) {
            colSep = makeSpan(["arraycolsep"], []);
            colSep.style.width = makeEm(options.fontMetrics().doubleRuleSep);
            cols.push(colSep);
          }
          if (colDescr.separator === "|" || colDescr.separator === ":") {
            var lineType = colDescr.separator === "|" ? "solid" : "dashed";
            var separator = makeSpan(["vertical-separator"], [], options);
            separator.style.height = makeEm(totalHeight);
            separator.style.borderRightWidth = makeEm(ruleThickness);
            separator.style.borderRightStyle = lineType;
            separator.style.margin = "0 " + makeEm(-ruleThickness / 2);
            var _shift = totalHeight - offset;
            if (_shift) {
              separator.style.verticalAlign = makeEm(-_shift);
            }
            cols.push(separator);
          } else {
            throw new ParseError("Invalid separator type: " + colDescr.separator);
          }
          colDescrNum++;
          colDescr = colDescriptions[colDescrNum];
          firstSeparator = false;
        }
        if (c >= nc) {
          continue;
        }
        var sepwidth = void 0;
        if (c > 0 || group.hskipBeforeAndAfter) {
          var _colDescr$pregap, _colDescr2;
          sepwidth = (_colDescr$pregap = (_colDescr2 = colDescr) == null ? void 0 : _colDescr2.pregap) != null ? _colDescr$pregap : arraycolsep;
          if (sepwidth !== 0) {
            colSep = makeSpan(["arraycolsep"], []);
            colSep.style.width = makeEm(sepwidth);
            cols.push(colSep);
          }
        }
        var colElems = [];
        for (r = 0; r < nr; ++r) {
          var row = body[r];
          var elem = row.cells[c];
          if (!elem) {
            continue;
          }
          var _shift2 = row.pos - offset;
          elem.depth = row.depth;
          elem.height = row.height;
          colElems.push({
            type: "elem",
            elem,
            shift: _shift2
          });
        }
        var colVList = makeVList({
          positionType: "individualShift",
          children: colElems
        });
        var colSpan = makeSpan(["col-align-" + (((_colDescr3 = colDescr) == null ? void 0 : _colDescr3.align) || "c")], [colVList]);
        cols.push(colSpan);
        if (c < nc - 1 || group.hskipBeforeAndAfter) {
          var _colDescr$postgap, _colDescr4;
          sepwidth = (_colDescr$postgap = (_colDescr4 = colDescr) == null ? void 0 : _colDescr4.postgap) != null ? _colDescr$postgap : arraycolsep;
          if (sepwidth !== 0) {
            colSep = makeSpan(["arraycolsep"], []);
            colSep.style.width = makeEm(sepwidth);
            cols.push(colSep);
          }
        }
      }
      var tableBody = makeSpan(["mtable"], cols);
      if (hlines.length > 0) {
        var line = makeLineSpan("hline", options, ruleThickness);
        var dashes = makeLineSpan("hdashline", options, ruleThickness);
        var vListElems = [{
          type: "elem",
          elem: tableBody,
          shift: 0
        }];
        while (hlines.length > 0) {
          var hline = hlines.pop();
          var lineShift = hline.pos - offset;
          if (hline.isDashed) {
            vListElems.push({
              type: "elem",
              elem: dashes,
              shift: lineShift
            });
          } else {
            vListElems.push({
              type: "elem",
              elem: line,
              shift: lineShift
            });
          }
        }
        tableBody = makeVList({
          positionType: "individualShift",
          children: vListElems
        });
      }
      if (tagSpans.length === 0) {
        return makeSpan(["mord"], [tableBody], options);
      } else {
        var eqnNumCol = makeVList({
          positionType: "individualShift",
          children: tagSpans
        });
        var tagCol = makeSpan(["tag"], [eqnNumCol], options);
        return makeFragment([tableBody, tagCol]);
      }
    };
    var alignMap = {
      c: "center ",
      l: "left ",
      r: "right "
    };
    var mathmlBuilder$5 = function mathmlBuilder(group, options) {
      var tbl = [];
      var glue = new MathNode("mtd", [], ["mtr-glue"]);
      var tag = new MathNode("mtd", [], ["mml-eqn-num"]);
      for (var i = 0; i < group.body.length; i++) {
        var rw = group.body[i];
        var row = [];
        for (var j = 0; j < rw.length; j++) {
          row.push(new MathNode("mtd", [buildGroup2(rw[j], options)]));
        }
        if (group.tags && group.tags[i]) {
          row.unshift(glue);
          row.push(glue);
          if (group.leqno) {
            row.unshift(tag);
          } else {
            row.push(tag);
          }
        }
        tbl.push(new MathNode("mtr", row));
      }
      var table = new MathNode("mtable", tbl);
      var gap = group.arraystretch === 0.5 ? 0.1 : 0.16 + group.arraystretch - 1 + (group.addJot ? 0.09 : 0);
      table.setAttribute("rowspacing", makeEm(gap));
      var menclose = "";
      var align = "";
      if (group.cols && group.cols.length > 0) {
        var cols = group.cols;
        var columnLines = "";
        var prevTypeWasAlign = false;
        var iStart = 0;
        var iEnd = cols.length;
        if (cols[0].type === "separator") {
          menclose += "top ";
          iStart = 1;
        }
        if (cols[cols.length - 1].type === "separator") {
          menclose += "bottom ";
          iEnd -= 1;
        }
        for (var _i = iStart; _i < iEnd; _i++) {
          var col = cols[_i];
          if (col.type === "align") {
            align += alignMap[col.align];
            if (prevTypeWasAlign) {
              columnLines += "none ";
            }
            prevTypeWasAlign = true;
          } else if (col.type === "separator") {
            if (prevTypeWasAlign) {
              columnLines += col.separator === "|" ? "solid " : "dashed ";
              prevTypeWasAlign = false;
            }
          }
        }
        table.setAttribute("columnalign", align.trim());
        if (/[sd]/.test(columnLines)) {
          table.setAttribute("columnlines", columnLines.trim());
        }
      }
      if (group.colSeparationType === "align") {
        var _cols = group.cols || [];
        var spacing2 = "";
        for (var _i2 = 1; _i2 < _cols.length; _i2++) {
          spacing2 += _i2 % 2 ? "0em " : "1em ";
        }
        table.setAttribute("columnspacing", spacing2.trim());
      } else if (group.colSeparationType === "alignat" || group.colSeparationType === "gather") {
        table.setAttribute("columnspacing", "0em");
      } else if (group.colSeparationType === "small") {
        table.setAttribute("columnspacing", "0.2778em");
      } else if (group.colSeparationType === "CD") {
        table.setAttribute("columnspacing", "0.5em");
      } else {
        table.setAttribute("columnspacing", "1em");
      }
      var rowLines = "";
      var hlines = group.hLinesBeforeRow;
      menclose += hlines[0].length > 0 ? "left " : "";
      menclose += hlines[hlines.length - 1].length > 0 ? "right " : "";
      for (var _i3 = 1; _i3 < hlines.length - 1; _i3++) {
        rowLines += hlines[_i3].length === 0 ? "none " : hlines[_i3][0] ? "dashed " : "solid ";
      }
      if (/[sd]/.test(rowLines)) {
        table.setAttribute("rowlines", rowLines.trim());
      }
      if (menclose !== "") {
        table = new MathNode("menclose", [table]);
        table.setAttribute("notation", menclose.trim());
      }
      if (group.arraystretch && group.arraystretch < 1) {
        table = new MathNode("mstyle", [table]);
        table.setAttribute("scriptlevel", "1");
      }
      return table;
    };
    var alignedHandler = function alignedHandler2(context, args) {
      if (!context.envName.includes("ed")) {
        validateAmsEnvironmentContext(context);
      }
      var cols = [];
      var separationType = context.envName.includes("at") ? "alignat" : "align";
      var isSplit = context.envName === "split";
      var res = parseArray(context.parser, {
        cols,
        addJot: true,
        autoTag: isSplit ? void 0 : getAutoTag(context.envName),
        emptySingleRow: true,
        colSeparationType: separationType,
        maxNumCols: isSplit ? 2 : void 0,
        leqno: context.parser.settings.leqno
      }, "display");
      var numMaths = 0;
      var numCols = 0;
      var emptyGroup = {
        type: "ordgroup",
        mode: context.mode,
        body: []
      };
      if (args[0] && args[0].type === "ordgroup") {
        var arg0 = "";
        for (var i = 0; i < args[0].body.length; i++) {
          var textord2 = assertNodeType(args[0].body[i], "textord");
          arg0 += textord2.text;
        }
        numMaths = Number(arg0);
        numCols = numMaths * 2;
      }
      var isAligned = !numCols;
      res.body.forEach(function(row) {
        for (var _i4 = 1; _i4 < row.length; _i4 += 2) {
          var styling = assertNodeType(row[_i4], "styling");
          var ordgroup = assertNodeType(styling.body[0], "ordgroup");
          ordgroup.body.unshift(emptyGroup);
        }
        if (!isAligned) {
          var curMaths = row.length / 2;
          if (numMaths < curMaths) {
            throw new ParseError("Too many math in a row: " + ("expected " + numMaths + ", but got " + curMaths), row[0]);
          }
        } else if (numCols < row.length) {
          numCols = row.length;
        }
      });
      for (var _i5 = 0; _i5 < numCols; ++_i5) {
        var align = "r";
        var pregap = 0;
        if (_i5 % 2 === 1) {
          align = "l";
        } else if (_i5 > 0 && isAligned) {
          pregap = 1;
        }
        cols[_i5] = {
          type: "align",
          align,
          pregap,
          postgap: 0
        };
      }
      res.colSeparationType = isAligned ? "align" : "alignat";
      return res;
    };
    defineEnvironment({
      type: "array",
      names: ["array", "darray"],
      props: {
        numArgs: 1
      },
      handler(context, args) {
        var symNode = checkSymbolNodeType(args[0]);
        var colalign = symNode ? [args[0]] : assertNodeType(args[0], "ordgroup").body;
        var cols = colalign.map(function(nde) {
          var node = assertSymbolNodeType(nde);
          var ca = node.text;
          if ("lcr".includes(ca)) {
            return {
              type: "align",
              align: ca
            };
          } else if (ca === "|") {
            return {
              type: "separator",
              separator: "|"
            };
          } else if (ca === ":") {
            return {
              type: "separator",
              separator: ":"
            };
          }
          throw new ParseError("Unknown column alignment: " + ca, nde);
        });
        var res = {
          cols,
          hskipBeforeAndAfter: true,
          // \@preamble in lttab.dtx
          maxNumCols: cols.length
        };
        return parseArray(context.parser, res, dCellStyle(context.envName));
      },
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineEnvironment({
      type: "array",
      names: ["matrix", "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix", "matrix*", "pmatrix*", "bmatrix*", "Bmatrix*", "vmatrix*", "Vmatrix*"],
      props: {
        numArgs: 0
      },
      handler(context) {
        var delimiters2 = {
          "matrix": null,
          "pmatrix": ["(", ")"],
          "bmatrix": ["[", "]"],
          "Bmatrix": ["\\{", "\\}"],
          "vmatrix": ["|", "|"],
          "Vmatrix": ["\\Vert", "\\Vert"]
        }[context.envName.replace("*", "")];
        var colAlign = "c";
        var payload = {
          hskipBeforeAndAfter: false,
          cols: [{
            type: "align",
            align: colAlign
          }]
        };
        if (context.envName.charAt(context.envName.length - 1) === "*") {
          var parser = context.parser;
          parser.consumeSpaces();
          if (parser.fetch().text === "[") {
            parser.consume();
            parser.consumeSpaces();
            colAlign = parser.fetch().text;
            if (!"lcr".includes(colAlign)) {
              throw new ParseError("Expected l or c or r", parser.nextToken);
            }
            parser.consume();
            parser.consumeSpaces();
            parser.expect("]");
            parser.consume();
            payload.cols = [{
              type: "align",
              align: colAlign
            }];
          }
        }
        var res = parseArray(context.parser, payload, dCellStyle(context.envName));
        var numCols = Math.max(0, ...res.body.map((row) => row.length));
        res.cols = new Array(numCols).fill({
          type: "align",
          align: colAlign
        });
        return delimiters2 ? {
          type: "leftright",
          mode: context.mode,
          body: [res],
          left: delimiters2[0],
          right: delimiters2[1],
          rightColor: void 0
          // \right uninfluenced by \color in array
        } : res;
      },
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineEnvironment({
      type: "array",
      names: ["smallmatrix"],
      props: {
        numArgs: 0
      },
      handler(context) {
        var payload = {
          arraystretch: 0.5
        };
        var res = parseArray(context.parser, payload, "script");
        res.colSeparationType = "small";
        return res;
      },
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineEnvironment({
      type: "array",
      names: ["subarray"],
      props: {
        numArgs: 1
      },
      handler(context, args) {
        var symNode = checkSymbolNodeType(args[0]);
        var colalign = symNode ? [args[0]] : assertNodeType(args[0], "ordgroup").body;
        var cols = colalign.map(function(nde) {
          var node = assertSymbolNodeType(nde);
          var ca = node.text;
          if ("lc".includes(ca)) {
            return {
              type: "align",
              align: ca
            };
          }
          throw new ParseError("Unknown column alignment: " + ca, nde);
        });
        if (cols.length > 1) {
          throw new ParseError("{subarray} can contain only one column");
        }
        var payload = {
          cols,
          hskipBeforeAndAfter: false,
          arraystretch: 0.5
        };
        var res = parseArray(context.parser, payload, "script");
        if (res.body.length > 0 && res.body[0].length > 1) {
          throw new ParseError("{subarray} can contain only one column");
        }
        return res;
      },
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineEnvironment({
      type: "array",
      names: ["cases", "dcases", "rcases", "drcases"],
      props: {
        numArgs: 0
      },
      handler(context) {
        var payload = {
          arraystretch: 1.2,
          cols: [{
            type: "align",
            align: "l",
            pregap: 0,
            // TODO(kevinb) get the current style.
            // For now we use the metrics for TEXT style which is what we were
            // doing before.  Before attempting to get the current style we
            // should look at TeX's behavior especially for \over and matrices.
            postgap: 1
            /* 1em quad */
          }, {
            type: "align",
            align: "l",
            pregap: 0,
            postgap: 0
          }]
        };
        var res = parseArray(context.parser, payload, dCellStyle(context.envName));
        return {
          type: "leftright",
          mode: context.mode,
          body: [res],
          left: context.envName.includes("r") ? "." : "\\{",
          right: context.envName.includes("r") ? "\\}" : ".",
          rightColor: void 0
        };
      },
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineEnvironment({
      type: "array",
      names: ["align", "align*", "aligned", "split"],
      props: {
        numArgs: 0
      },
      handler: alignedHandler,
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineEnvironment({
      type: "array",
      names: ["gathered", "gather", "gather*"],
      props: {
        numArgs: 0
      },
      handler(context) {
        if (gatherEnvironments.has(context.envName)) {
          validateAmsEnvironmentContext(context);
        }
        var res = {
          cols: [{
            type: "align",
            align: "c"
          }],
          addJot: true,
          colSeparationType: "gather",
          autoTag: getAutoTag(context.envName),
          emptySingleRow: true,
          leqno: context.parser.settings.leqno
        };
        return parseArray(context.parser, res, "display");
      },
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineEnvironment({
      type: "array",
      names: ["alignat", "alignat*", "alignedat"],
      props: {
        numArgs: 1
      },
      handler: alignedHandler,
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineEnvironment({
      type: "array",
      names: ["equation", "equation*"],
      props: {
        numArgs: 0
      },
      handler(context) {
        validateAmsEnvironmentContext(context);
        var res = {
          autoTag: getAutoTag(context.envName),
          emptySingleRow: true,
          singleRow: true,
          maxNumCols: 1,
          leqno: context.parser.settings.leqno
        };
        return parseArray(context.parser, res, "display");
      },
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineEnvironment({
      type: "array",
      names: ["CD"],
      props: {
        numArgs: 0
      },
      handler(context) {
        validateAmsEnvironmentContext(context);
        return parseCD(context.parser);
      },
      htmlBuilder: htmlBuilder$6,
      mathmlBuilder: mathmlBuilder$5
    });
    defineMacro("\\nonumber", "\\gdef\\@eqnsw{0}");
    defineMacro("\\notag", "\\nonumber");
    defineFunction({
      type: "text",
      // Doesn't matter what this is.
      names: ["\\hline", "\\hdashline"],
      props: {
        numArgs: 0,
        allowedInText: true,
        allowedInMath: true
      },
      handler(context, args) {
        throw new ParseError(context.funcName + " valid only within array environment");
      }
    });
    var environments = _environments;
    defineFunction({
      type: "environment",
      names: ["\\begin", "\\end"],
      props: {
        numArgs: 1,
        argTypes: ["text"]
      },
      handler(_ref, args) {
        var {
          parser,
          funcName
        } = _ref;
        var nameGroup = args[0];
        if (nameGroup.type !== "ordgroup") {
          throw new ParseError("Invalid environment name", nameGroup);
        }
        var envName = "";
        for (var i = 0; i < nameGroup.body.length; ++i) {
          envName += assertNodeType(nameGroup.body[i], "textord").text;
        }
        if (funcName === "\\begin") {
          if (!environments.hasOwnProperty(envName)) {
            throw new ParseError("No such environment: " + envName, nameGroup);
          }
          var env = environments[envName];
          var {
            args: _args,
            optArgs
          } = parser.parseArguments("\\begin{" + envName + "}", env);
          var context = {
            mode: parser.mode,
            envName,
            parser
          };
          var result = env.handler(context, _args, optArgs);
          parser.expect("\\end", false);
          var endNameToken = parser.nextToken;
          var end = assertNodeType(parser.parseFunction(), "environment");
          if (end.name !== envName) {
            throw new ParseError("Mismatch: \\begin{" + envName + "} matched by \\end{" + end.name + "}", endNameToken);
          }
          return result;
        }
        return {
          type: "environment",
          mode: parser.mode,
          name: envName,
          nameGroup
        };
      }
    });
    var htmlBuilder$5 = (group, options) => {
      var font = group.font;
      var newOptions = options.withFont(font);
      return buildGroup$1(group.body, newOptions);
    };
    var mathmlBuilder$4 = (group, options) => {
      var font = group.font;
      var newOptions = options.withFont(font);
      return buildGroup2(group.body, newOptions);
    };
    var fontAliases = {
      "\\Bbb": "\\mathbb",
      "\\bold": "\\mathbf",
      "\\frak": "\\mathfrak"
    };
    defineFunction({
      type: "font",
      names: [
        // styles, except \boldsymbol defined below
        "\\mathrm",
        "\\mathit",
        "\\mathbf",
        "\\mathnormal",
        "\\mathsfit",
        // families
        "\\mathbb",
        "\\mathcal",
        "\\mathfrak",
        "\\mathscr",
        "\\mathsf",
        "\\mathtt",
        // aliases, except \bm defined below
        "\\Bbb",
        "\\bold",
        "\\frak"
      ],
      props: {
        numArgs: 1,
        allowedInArgument: true
      },
      handler: (_ref, args) => {
        var {
          parser,
          funcName
        } = _ref;
        var body = normalizeArgument(args[0]);
        var func = funcName;
        if (func in fontAliases) {
          func = fontAliases[func];
        }
        return {
          type: "font",
          mode: parser.mode,
          font: func.slice(1),
          body
        };
      },
      htmlBuilder: htmlBuilder$5,
      mathmlBuilder: mathmlBuilder$4
    });
    defineFunction({
      type: "mclass",
      names: ["\\boldsymbol", "\\bm"],
      props: {
        numArgs: 1
      },
      handler: (_ref2, args) => {
        var {
          parser
        } = _ref2;
        var body = args[0];
        return {
          type: "mclass",
          mode: parser.mode,
          mclass: binrelClass(body),
          body: [{
            type: "font",
            mode: parser.mode,
            font: "boldsymbol",
            body
          }],
          isCharacterBox: isCharacterBox(body)
        };
      }
    });
    defineFunction({
      type: "font",
      names: ["\\rm", "\\sf", "\\tt", "\\bf", "\\it", "\\cal"],
      props: {
        numArgs: 0,
        allowedInText: true
      },
      handler: (_ref3, args) => {
        var {
          parser,
          funcName,
          breakOnTokenText
        } = _ref3;
        var {
          mode
        } = parser;
        var body = parser.parseExpression(true, breakOnTokenText);
        return {
          type: "font",
          mode,
          font: "math" + funcName.slice(1),
          body: {
            type: "ordgroup",
            mode: parser.mode,
            body
          }
        };
      },
      htmlBuilder: htmlBuilder$5,
      mathmlBuilder: mathmlBuilder$4
    });
    var htmlBuilder$4 = (group, options) => {
      var style = options.style;
      var nstyle = style.fracNum();
      var dstyle = style.fracDen();
      var newOptions;
      newOptions = options.havingStyle(nstyle);
      var numerm = buildGroup$1(group.numer, newOptions, options);
      if (group.continued) {
        var hStrut = 8.5 / options.fontMetrics().ptPerEm;
        var dStrut = 3.5 / options.fontMetrics().ptPerEm;
        numerm.height = numerm.height < hStrut ? hStrut : numerm.height;
        numerm.depth = numerm.depth < dStrut ? dStrut : numerm.depth;
      }
      newOptions = options.havingStyle(dstyle);
      var denomm = buildGroup$1(group.denom, newOptions, options);
      var rule;
      var ruleWidth;
      var ruleSpacing;
      if (group.hasBarLine) {
        if (group.barSize) {
          ruleWidth = calculateSize(group.barSize, options);
          rule = makeLineSpan("frac-line", options, ruleWidth);
        } else {
          rule = makeLineSpan("frac-line", options);
        }
        ruleWidth = rule.height;
        ruleSpacing = rule.height;
      } else {
        rule = null;
        ruleWidth = 0;
        ruleSpacing = options.fontMetrics().defaultRuleThickness;
      }
      var numShift;
      var clearance;
      var denomShift;
      if (style.size === Style$1.DISPLAY.size) {
        numShift = options.fontMetrics().num1;
        if (ruleWidth > 0) {
          clearance = 3 * ruleSpacing;
        } else {
          clearance = 7 * ruleSpacing;
        }
        denomShift = options.fontMetrics().denom1;
      } else {
        if (ruleWidth > 0) {
          numShift = options.fontMetrics().num2;
          clearance = ruleSpacing;
        } else {
          numShift = options.fontMetrics().num3;
          clearance = 3 * ruleSpacing;
        }
        denomShift = options.fontMetrics().denom2;
      }
      var frac;
      if (!rule) {
        var candidateClearance = numShift - numerm.depth - (denomm.height - denomShift);
        if (candidateClearance < clearance) {
          numShift += 0.5 * (clearance - candidateClearance);
          denomShift += 0.5 * (clearance - candidateClearance);
        }
        frac = makeVList({
          positionType: "individualShift",
          children: [{
            type: "elem",
            elem: denomm,
            shift: denomShift
          }, {
            type: "elem",
            elem: numerm,
            shift: -numShift
          }]
        });
      } else {
        var axisHeight = options.fontMetrics().axisHeight;
        if (numShift - numerm.depth - (axisHeight + 0.5 * ruleWidth) < clearance) {
          numShift += clearance - (numShift - numerm.depth - (axisHeight + 0.5 * ruleWidth));
        }
        if (axisHeight - 0.5 * ruleWidth - (denomm.height - denomShift) < clearance) {
          denomShift += clearance - (axisHeight - 0.5 * ruleWidth - (denomm.height - denomShift));
        }
        var midShift = -(axisHeight - 0.5 * ruleWidth);
        frac = makeVList({
          positionType: "individualShift",
          children: [{
            type: "elem",
            elem: denomm,
            shift: denomShift
          }, {
            type: "elem",
            elem: rule,
            shift: midShift
          }, {
            type: "elem",
            elem: numerm,
            shift: -numShift
          }]
        });
      }
      newOptions = options.havingStyle(style);
      frac.height *= newOptions.sizeMultiplier / options.sizeMultiplier;
      frac.depth *= newOptions.sizeMultiplier / options.sizeMultiplier;
      var delimSize;
      if (style.size === Style$1.DISPLAY.size) {
        delimSize = options.fontMetrics().delim1;
      } else if (style.size === Style$1.SCRIPTSCRIPT.size) {
        delimSize = options.havingStyle(Style$1.SCRIPT).fontMetrics().delim2;
      } else {
        delimSize = options.fontMetrics().delim2;
      }
      var leftDelim;
      var rightDelim;
      if (group.leftDelim == null) {
        leftDelim = makeNullDelimiter(options, ["mopen"]);
      } else {
        leftDelim = makeCustomSizedDelim(group.leftDelim, delimSize, true, options.havingStyle(style), group.mode, ["mopen"]);
      }
      if (group.continued) {
        rightDelim = makeSpan([]);
      } else if (group.rightDelim == null) {
        rightDelim = makeNullDelimiter(options, ["mclose"]);
      } else {
        rightDelim = makeCustomSizedDelim(group.rightDelim, delimSize, true, options.havingStyle(style), group.mode, ["mclose"]);
      }
      return makeSpan(["mord"].concat(newOptions.sizingClasses(options)), [leftDelim, makeSpan(["mfrac"], [frac]), rightDelim], options);
    };
    var mathmlBuilder$3 = (group, options) => {
      var node = new MathNode("mfrac", [buildGroup2(group.numer, options), buildGroup2(group.denom, options)]);
      if (!group.hasBarLine) {
        node.setAttribute("linethickness", "0px");
      } else if (group.barSize) {
        var ruleWidth = calculateSize(group.barSize, options);
        node.setAttribute("linethickness", makeEm(ruleWidth));
      }
      if (group.leftDelim != null || group.rightDelim != null) {
        var withDelims = [];
        if (group.leftDelim != null) {
          var leftOp = new MathNode("mo", [new TextNode(group.leftDelim.replace("\\", ""))]);
          leftOp.setAttribute("fence", "true");
          withDelims.push(leftOp);
        }
        withDelims.push(node);
        if (group.rightDelim != null) {
          var rightOp = new MathNode("mo", [new TextNode(group.rightDelim.replace("\\", ""))]);
          rightOp.setAttribute("fence", "true");
          withDelims.push(rightOp);
        }
        return makeRow(withDelims);
      }
      return node;
    };
    var wrapWithStyle = (frac, style) => {
      if (!style) {
        return frac;
      }
      var wrapper = {
        type: "styling",
        mode: frac.mode,
        style,
        body: [frac]
      };
      return wrapper;
    };
    defineFunction({
      type: "genfrac",
      names: [
        "\\cfrac",
        "\\dfrac",
        "\\frac",
        "\\tfrac",
        "\\dbinom",
        "\\binom",
        "\\tbinom",
        "\\\\atopfrac",
        // can’t be entered directly
        "\\\\bracefrac",
        "\\\\brackfrac"
        // ditto
      ],
      props: {
        numArgs: 2,
        allowedInArgument: true
      },
      handler: (_ref, args) => {
        var {
          parser,
          funcName
        } = _ref;
        var numer = args[0];
        var denom = args[1];
        var hasBarLine;
        var leftDelim = null;
        var rightDelim = null;
        switch (funcName) {
          case "\\cfrac":
          case "\\dfrac":
          case "\\frac":
          case "\\tfrac":
            hasBarLine = true;
            break;
          case "\\\\atopfrac":
            hasBarLine = false;
            break;
          case "\\dbinom":
          case "\\binom":
          case "\\tbinom":
            hasBarLine = false;
            leftDelim = "(";
            rightDelim = ")";
            break;
          case "\\\\bracefrac":
            hasBarLine = false;
            leftDelim = "\\{";
            rightDelim = "\\}";
            break;
          case "\\\\brackfrac":
            hasBarLine = false;
            leftDelim = "[";
            rightDelim = "]";
            break;
          default:
            throw new Error("Unrecognized genfrac command");
        }
        var continued = funcName === "\\cfrac";
        var style = null;
        if (continued || funcName.startsWith("\\d")) {
          style = "display";
        } else if (funcName.startsWith("\\t")) {
          style = "text";
        }
        return wrapWithStyle({
          type: "genfrac",
          mode: parser.mode,
          numer,
          denom,
          continued,
          hasBarLine,
          leftDelim,
          rightDelim,
          barSize: null
        }, style);
      },
      htmlBuilder: htmlBuilder$4,
      mathmlBuilder: mathmlBuilder$3
    });
    defineFunction({
      type: "infix",
      names: ["\\over", "\\choose", "\\atop", "\\brace", "\\brack"],
      props: {
        numArgs: 0,
        infix: true
      },
      handler(_ref2) {
        var {
          parser,
          funcName,
          token
        } = _ref2;
        var replaceWith;
        switch (funcName) {
          case "\\over":
            replaceWith = "\\frac";
            break;
          case "\\choose":
            replaceWith = "\\binom";
            break;
          case "\\atop":
            replaceWith = "\\\\atopfrac";
            break;
          case "\\brace":
            replaceWith = "\\\\bracefrac";
            break;
          case "\\brack":
            replaceWith = "\\\\brackfrac";
            break;
          default:
            throw new Error("Unrecognized infix genfrac command");
        }
        return {
          type: "infix",
          mode: parser.mode,
          replaceWith,
          token
        };
      }
    });
    var stylArray = ["display", "text", "script", "scriptscript"];
    var delimFromValue = function delimFromValue2(delimString) {
      var delim = null;
      if (delimString.length > 0) {
        delim = delimString;
        delim = delim === "." ? null : delim;
      }
      return delim;
    };
    defineFunction({
      type: "genfrac",
      names: ["\\genfrac"],
      props: {
        numArgs: 6,
        allowedInArgument: true,
        argTypes: ["math", "math", "size", "text", "math", "math"]
      },
      handler(_ref3, args) {
        var {
          parser
        } = _ref3;
        var numer = args[4];
        var denom = args[5];
        var leftNode = normalizeArgument(args[0]);
        var leftDelim = leftNode.type === "atom" && leftNode.family === "open" ? delimFromValue(leftNode.text) : null;
        var rightNode = normalizeArgument(args[1]);
        var rightDelim = rightNode.type === "atom" && rightNode.family === "close" ? delimFromValue(rightNode.text) : null;
        var barNode = assertNodeType(args[2], "size");
        var hasBarLine;
        var barSize = null;
        if (barNode.isBlank) {
          hasBarLine = true;
        } else {
          barSize = barNode.value;
          hasBarLine = barSize.number > 0;
        }
        var size = null;
        var styl = args[3];
        if (styl.type === "ordgroup") {
          if (styl.body.length > 0) {
            var textOrd = assertNodeType(styl.body[0], "textord");
            size = stylArray[Number(textOrd.text)];
          }
        } else {
          styl = assertNodeType(styl, "textord");
          size = stylArray[Number(styl.text)];
        }
        return wrapWithStyle({
          type: "genfrac",
          mode: parser.mode,
          numer,
          denom,
          continued: false,
          hasBarLine,
          barSize,
          leftDelim,
          rightDelim
        }, size);
      }
    });
    defineFunction({
      type: "infix",
      names: ["\\above"],
      props: {
        numArgs: 1,
        argTypes: ["size"],
        infix: true
      },
      handler(_ref4, args) {
        var {
          parser,
          funcName,
          token
        } = _ref4;
        return {
          type: "infix",
          mode: parser.mode,
          replaceWith: "\\\\abovefrac",
          size: assertNodeType(args[0], "size").value,
          token
        };
      }
    });
    defineFunction({
      type: "genfrac",
      names: ["\\\\abovefrac"],
      props: {
        numArgs: 3,
        argTypes: ["math", "size", "math"]
      },
      handler: (_ref5, args) => {
        var {
          parser,
          funcName
        } = _ref5;
        var numer = args[0];
        var barSize = assertNodeType(args[1], "infix").size;
        if (!barSize) {
          throw new Error("\\\\abovefrac expected size, but got " + String(barSize));
        }
        var denom = args[2];
        var hasBarLine = barSize.number > 0;
        return {
          type: "genfrac",
          mode: parser.mode,
          numer,
          denom,
          continued: false,
          hasBarLine,
          barSize,
          leftDelim: null,
          rightDelim: null
        };
      }
    });
    var htmlBuilder$3 = (grp, options) => {
      var style = options.style;
      var supSubGroup;
      var group;
      if (grp.type === "supsub") {
        supSubGroup = grp.sup ? buildGroup$1(grp.sup, options.havingStyle(style.sup()), options) : buildGroup$1(grp.sub, options.havingStyle(style.sub()), options);
        group = assertNodeType(grp.base, "horizBrace");
      } else {
        group = assertNodeType(grp, "horizBrace");
      }
      var body = buildGroup$1(group.base, options.havingBaseStyle(Style$1.DISPLAY));
      var braceBody = stretchySvg(group, options);
      var vlist;
      if (group.isOver) {
        vlist = makeVList({
          positionType: "firstBaseline",
          children: [{
            type: "elem",
            elem: body
          }, {
            type: "kern",
            size: 0.1
          }, {
            type: "elem",
            elem: braceBody,
            wrapperClasses: ["svg-align"]
          }]
        });
      } else {
        vlist = makeVList({
          positionType: "bottom",
          positionData: body.depth + 0.1 + braceBody.height,
          children: [{
            type: "elem",
            elem: braceBody,
            wrapperClasses: ["svg-align"]
          }, {
            type: "kern",
            size: 0.1
          }, {
            type: "elem",
            elem: body
          }]
        });
      }
      if (supSubGroup) {
        var vSpan = makeSpan(["minner", group.isOver ? "mover" : "munder"], [vlist], options);
        if (group.isOver) {
          vlist = makeVList({
            positionType: "firstBaseline",
            children: [{
              type: "elem",
              elem: vSpan
            }, {
              type: "kern",
              size: 0.2
            }, {
              type: "elem",
              elem: supSubGroup
            }]
          });
        } else {
          vlist = makeVList({
            positionType: "bottom",
            positionData: vSpan.depth + 0.2 + supSubGroup.height + supSubGroup.depth,
            children: [{
              type: "elem",
              elem: supSubGroup
            }, {
              type: "kern",
              size: 0.2
            }, {
              type: "elem",
              elem: vSpan
            }]
          });
        }
      }
      return makeSpan(["minner", group.isOver ? "mover" : "munder"], [vlist], options);
    };
    var mathmlBuilder$2 = (group, options) => {
      var accentNode = stretchyMathML(group.label);
      return new MathNode(group.isOver ? "mover" : "munder", [buildGroup2(group.base, options), accentNode]);
    };
    defineFunction({
      type: "horizBrace",
      names: ["\\overbrace", "\\underbrace", "\\overbracket", "\\underbracket"],
      props: {
        numArgs: 1
      },
      handler(_ref, args) {
        var {
          parser,
          funcName
        } = _ref;
        return {
          type: "horizBrace",
          mode: parser.mode,
          label: funcName,
          isOver: funcName.includes("\\over"),
          base: args[0]
        };
      },
      htmlBuilder: htmlBuilder$3,
      mathmlBuilder: mathmlBuilder$2
    });
    defineFunction({
      type: "href",
      names: ["\\href"],
      props: {
        numArgs: 2,
        argTypes: ["url", "original"],
        allowedInText: true
      },
      handler: (_ref, args) => {
        var {
          parser
        } = _ref;
        var body = args[1];
        var href = assertNodeType(args[0], "url").url;
        if (!parser.settings.isTrusted({
          command: "\\href",
          url: href
        })) {
          return parser.formatUnsupportedCmd("\\href");
        }
        return {
          type: "href",
          mode: parser.mode,
          href,
          body: ordargument(body)
        };
      },
      htmlBuilder: (group, options) => {
        var elements = buildExpression$1(group.body, options, false);
        return makeAnchor(group.href, [], elements, options);
      },
      mathmlBuilder: (group, options) => {
        var math2 = buildExpressionRow(group.body, options);
        if (!(math2 instanceof MathNode)) {
          math2 = new MathNode("mrow", [math2]);
        }
        math2.setAttribute("href", group.href);
        return math2;
      }
    });
    defineFunction({
      type: "href",
      names: ["\\url"],
      props: {
        numArgs: 1,
        argTypes: ["url"],
        allowedInText: true
      },
      handler: (_ref2, args) => {
        var {
          parser
        } = _ref2;
        var href = assertNodeType(args[0], "url").url;
        if (!parser.settings.isTrusted({
          command: "\\url",
          url: href
        })) {
          return parser.formatUnsupportedCmd("\\url");
        }
        var chars = [];
        for (var i = 0; i < href.length; i++) {
          var c = href[i];
          if (c === "~") {
            c = "\\textasciitilde";
          }
          chars.push({
            type: "textord",
            mode: "text",
            text: c
          });
        }
        var body = {
          type: "text",
          mode: parser.mode,
          font: "\\texttt",
          body: chars
        };
        return {
          type: "href",
          mode: parser.mode,
          href,
          body: ordargument(body)
        };
      }
    });
    defineFunction({
      type: "hbox",
      names: ["\\hbox"],
      props: {
        numArgs: 1,
        argTypes: ["text"],
        allowedInText: true,
        primitive: true
      },
      handler(_ref, args) {
        var {
          parser
        } = _ref;
        return {
          type: "hbox",
          mode: parser.mode,
          body: ordargument(args[0])
        };
      },
      htmlBuilder(group, options) {
        var elements = buildExpression$1(group.body, options.withFont(""), false);
        return makeFragment(elements);
      },
      mathmlBuilder(group, options) {
        return new MathNode("mrow", buildExpression2(group.body, options.withFont("")));
      }
    });
    defineFunction({
      type: "html",
      names: ["\\htmlClass", "\\htmlId", "\\htmlStyle", "\\htmlData"],
      props: {
        numArgs: 2,
        argTypes: ["raw", "original"],
        allowedInText: true
      },
      handler: (_ref, args) => {
        var {
          parser,
          funcName,
          token
        } = _ref;
        var value = assertNodeType(args[0], "raw").string;
        var body = args[1];
        if (parser.settings.strict) {
          parser.settings.reportNonstrict("htmlExtension", "HTML extension is disabled on strict mode");
        }
        var trustContext;
        var attributes = {};
        switch (funcName) {
          case "\\htmlClass":
            attributes.class = value;
            trustContext = {
              command: "\\htmlClass",
              class: value
            };
            break;
          case "\\htmlId":
            attributes.id = value;
            trustContext = {
              command: "\\htmlId",
              id: value
            };
            break;
          case "\\htmlStyle":
            attributes.style = value;
            trustContext = {
              command: "\\htmlStyle",
              style: value
            };
            break;
          case "\\htmlData": {
            var data = value.split(",");
            for (var i = 0; i < data.length; i++) {
              var item = data[i];
              var firstEquals = item.indexOf("=");
              if (firstEquals < 0) {
                throw new ParseError("\\htmlData key/value '" + item + "' missing equals sign");
              }
              var key = item.slice(0, firstEquals);
              var _value = item.slice(firstEquals + 1);
              attributes["data-" + key.trim()] = _value;
            }
            trustContext = {
              command: "\\htmlData",
              attributes
            };
            break;
          }
          default:
            throw new Error("Unrecognized html command");
        }
        if (!parser.settings.isTrusted(trustContext)) {
          return parser.formatUnsupportedCmd(funcName);
        }
        return {
          type: "html",
          mode: parser.mode,
          attributes,
          body: ordargument(body)
        };
      },
      htmlBuilder: (group, options) => {
        var elements = buildExpression$1(group.body, options, false);
        var classes = ["enclosing"];
        if (group.attributes.class) {
          classes.push(...group.attributes.class.trim().split(/\s+/));
        }
        var span = makeSpan(classes, elements, options);
        for (var attr in group.attributes) {
          if (attr !== "class" && group.attributes.hasOwnProperty(attr)) {
            span.setAttribute(attr, group.attributes[attr]);
          }
        }
        return span;
      },
      mathmlBuilder: (group, options) => {
        return buildExpressionRow(group.body, options);
      }
    });
    defineFunction({
      type: "htmlmathml",
      names: ["\\html@mathml"],
      props: {
        numArgs: 2,
        allowedInArgument: true,
        allowedInText: true
      },
      handler: (_ref, args) => {
        var {
          parser
        } = _ref;
        return {
          type: "htmlmathml",
          mode: parser.mode,
          html: ordargument(args[0]),
          mathml: ordargument(args[1])
        };
      },
      htmlBuilder: (group, options) => {
        var elements = buildExpression$1(group.html, options, false);
        return makeFragment(elements);
      },
      mathmlBuilder: (group, options) => {
        return buildExpressionRow(group.mathml, options);
      }
    });
    var sizeData = function sizeData2(str) {
      if (/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(str)) {
        return {
          number: +str,
          unit: "bp"
        };
      } else {
        var match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(str);
        if (!match) {
          throw new ParseError("Invalid size: '" + str + "' in \\includegraphics");
        }
        var data = {
          number: +(match[1] + match[2]),
          // sign + magnitude, cast to number
          unit: match[3]
        };
        if (!validUnit(data)) {
          throw new ParseError("Invalid unit: '" + data.unit + "' in \\includegraphics.");
        }
        return data;
      }
    };
    defineFunction({
      type: "includegraphics",
      names: ["\\includegraphics"],
      props: {
        numArgs: 1,
        numOptionalArgs: 1,
        argTypes: ["raw", "url"],
        allowedInText: false
      },
      handler: (_ref, args, optArgs) => {
        var {
          parser
        } = _ref;
        var width = {
          number: 0,
          unit: "em"
        };
        var height = {
          number: 0.9,
          unit: "em"
        };
        var totalheight = {
          number: 0,
          unit: "em"
        };
        var alt = "";
        if (optArgs[0]) {
          var attributeStr = assertNodeType(optArgs[0], "raw").string;
          var attributes = attributeStr.split(",");
          for (var i = 0; i < attributes.length; i++) {
            var keyVal = attributes[i].split("=");
            if (keyVal.length === 2) {
              var str = keyVal[1].trim();
              switch (keyVal[0].trim()) {
                case "alt":
                  alt = str;
                  break;
                case "width":
                  width = sizeData(str);
                  break;
                case "height":
                  height = sizeData(str);
                  break;
                case "totalheight":
                  totalheight = sizeData(str);
                  break;
                default:
                  throw new ParseError("Invalid key: '" + keyVal[0] + "' in \\includegraphics.");
              }
            }
          }
        }
        var src = assertNodeType(args[0], "url").url;
        if (alt === "") {
          alt = src;
          alt = alt.replace(/^.*[\\/]/, "");
          alt = alt.substring(0, alt.lastIndexOf("."));
        }
        if (!parser.settings.isTrusted({
          command: "\\includegraphics",
          url: src
        })) {
          return parser.formatUnsupportedCmd("\\includegraphics");
        }
        return {
          type: "includegraphics",
          mode: parser.mode,
          alt,
          width,
          height,
          totalheight,
          src
        };
      },
      htmlBuilder: (group, options) => {
        var height = calculateSize(group.height, options);
        var depth = 0;
        if (group.totalheight.number > 0) {
          depth = calculateSize(group.totalheight, options) - height;
        }
        var width = 0;
        if (group.width.number > 0) {
          width = calculateSize(group.width, options);
        }
        var style = {
          height: makeEm(height + depth)
        };
        if (width > 0) {
          style.width = makeEm(width);
        }
        if (depth > 0) {
          style.verticalAlign = makeEm(-depth);
        }
        var node = new Img(group.src, group.alt, style);
        node.height = height;
        node.depth = depth;
        return node;
      },
      mathmlBuilder: (group, options) => {
        var node = new MathNode("mglyph", []);
        node.setAttribute("alt", group.alt);
        var height = calculateSize(group.height, options);
        var depth = 0;
        if (group.totalheight.number > 0) {
          depth = calculateSize(group.totalheight, options) - height;
          node.setAttribute("valign", makeEm(-depth));
        }
        node.setAttribute("height", makeEm(height + depth));
        if (group.width.number > 0) {
          var width = calculateSize(group.width, options);
          node.setAttribute("width", makeEm(width));
        }
        node.setAttribute("src", group.src);
        return node;
      }
    });
    defineFunction({
      type: "kern",
      names: ["\\kern", "\\mkern", "\\hskip", "\\mskip"],
      props: {
        numArgs: 1,
        argTypes: ["size"],
        primitive: true,
        allowedInText: true
      },
      handler(_ref, args) {
        var {
          parser,
          funcName
        } = _ref;
        var size = assertNodeType(args[0], "size");
        if (parser.settings.strict) {
          var mathFunction = funcName[1] === "m";
          var muUnit = size.value.unit === "mu";
          if (mathFunction) {
            if (!muUnit) {
              parser.settings.reportNonstrict("mathVsTextUnits", "LaTeX's " + funcName + " supports only mu units, " + ("not " + size.value.unit + " units"));
            }
            if (parser.mode !== "math") {
              parser.settings.reportNonstrict("mathVsTextUnits", "LaTeX's " + funcName + " works only in math mode");
            }
          } else {
            if (muUnit) {
              parser.settings.reportNonstrict("mathVsTextUnits", "LaTeX's " + funcName + " doesn't support mu units");
            }
          }
        }
        return {
          type: "kern",
          mode: parser.mode,
          dimension: size.value
        };
      },
      htmlBuilder(group, options) {
        return makeGlue(group.dimension, options);
      },
      mathmlBuilder(group, options) {
        var dimension = calculateSize(group.dimension, options);
        return new SpaceNode(dimension);
      }
    });
    defineFunction({
      type: "lap",
      names: ["\\mathllap", "\\mathrlap", "\\mathclap"],
      props: {
        numArgs: 1,
        allowedInText: true
      },
      handler: (_ref, args) => {
        var {
          parser,
          funcName
        } = _ref;
        var body = args[0];
        return {
          type: "lap",
          mode: parser.mode,
          alignment: funcName.slice(5),
          body
        };
      },
      htmlBuilder: (group, options) => {
        var inner2;
        if (group.alignment === "clap") {
          inner2 = makeSpan([], [buildGroup$1(group.body, options)]);
          inner2 = makeSpan(["inner"], [inner2], options);
        } else {
          inner2 = makeSpan(["inner"], [buildGroup$1(group.body, options)]);
        }
        var fix = makeSpan(["fix"], []);
        var node = makeSpan([group.alignment], [inner2, fix], options);
        var strut = makeSpan(["strut"]);
        strut.style.height = makeEm(node.height + node.depth);
        if (node.depth) {
          strut.style.verticalAlign = makeEm(-node.depth);
        }
        node.children.unshift(strut);
        node = makeSpan(["thinbox"], [node], options);
        return makeSpan(["mord", "vbox"], [node], options);
      },
      mathmlBuilder: (group, options) => {
        var node = new MathNode("mpadded", [buildGroup2(group.body, options)]);
        if (group.alignment !== "rlap") {
          var offset = group.alignment === "llap" ? "-1" : "-0.5";
          node.setAttribute("lspace", offset + "width");
        }
        node.setAttribute("width", "0px");
        return node;
      }
    });
    defineFunction({
      type: "styling",
      names: ["\\(", "$"],
      props: {
        numArgs: 0,
        allowedInText: true,
        allowedInMath: false
      },
      handler(_ref, args) {
        var {
          funcName,
          parser
        } = _ref;
        var outerMode = parser.mode;
        parser.switchMode("math");
        var close2 = funcName === "\\(" ? "\\)" : "$";
        var body = parser.parseExpression(false, close2);
        parser.expect(close2);
        parser.switchMode(outerMode);
        return {
          type: "styling",
          mode: parser.mode,
          style: "text",
          resetFont: true,
          body
        };
      }
    });
    defineFunction({
      type: "text",
      // Doesn't matter what this is.
      names: ["\\)", "\\]"],
      props: {
        numArgs: 0,
        allowedInText: true,
        allowedInMath: false
      },
      handler(context, args) {
        throw new ParseError("Mismatched " + context.funcName);
      }
    });
    var chooseMathStyle = (group, options) => {
      switch (options.style.size) {
        case Style$1.DISPLAY.size:
          return group.display;
        case Style$1.TEXT.size:
          return group.text;
        case Style$1.SCRIPT.size:
          return group.script;
        case Style$1.SCRIPTSCRIPT.size:
          return group.scriptscript;
        default:
          return group.text;
      }
    };
    defineFunction({
      type: "mathchoice",
      names: ["\\mathchoice"],
      props: {
        numArgs: 4,
        primitive: true
      },
      handler: (_ref, args) => {
        var {
          parser
        } = _ref;
        return {
          type: "mathchoice",
          mode: parser.mode,
          display: ordargument(args[0]),
          text: ordargument(args[1]),
          script: ordargument(args[2]),
          scriptscript: ordargument(args[3])
        };
      },
      htmlBuilder: (group, options) => {
        var body = chooseMathStyle(group, options);
        var elements = buildExpression$1(body, options, false);
        return makeFragment(elements);
      },
      mathmlBuilder: (group, options) => {
        var body = chooseMathStyle(group, options);
        return buildExpressionRow(body, options);
      }
    });
    var assembleSupSub = (base, supGroup, subGroup, options, style, slant, baseShift) => {
      base = makeSpan([], [base]);
      var subIsSingleCharacter = subGroup && isCharacterBox(subGroup);
      var sub2;
      var sup2;
      if (supGroup) {
        var elem = buildGroup$1(supGroup, options.havingStyle(style.sup()), options);
        sup2 = {
          elem,
          kern: Math.max(options.fontMetrics().bigOpSpacing1, options.fontMetrics().bigOpSpacing3 - elem.depth)
        };
      }
      if (subGroup) {
        var _elem = buildGroup$1(subGroup, options.havingStyle(style.sub()), options);
        sub2 = {
          elem: _elem,
          kern: Math.max(options.fontMetrics().bigOpSpacing2, options.fontMetrics().bigOpSpacing4 - _elem.height)
        };
      }
      var finalGroup;
      if (sup2 && sub2) {
        var bottom = options.fontMetrics().bigOpSpacing5 + sub2.elem.height + sub2.elem.depth + sub2.kern + base.depth + baseShift;
        finalGroup = makeVList({
          positionType: "bottom",
          positionData: bottom,
          children: [{
            type: "kern",
            size: options.fontMetrics().bigOpSpacing5
          }, {
            type: "elem",
            elem: sub2.elem,
            marginLeft: makeEm(-slant)
          }, {
            type: "kern",
            size: sub2.kern
          }, {
            type: "elem",
            elem: base
          }, {
            type: "kern",
            size: sup2.kern
          }, {
            type: "elem",
            elem: sup2.elem,
            marginLeft: makeEm(slant)
          }, {
            type: "kern",
            size: options.fontMetrics().bigOpSpacing5
          }]
        });
      } else if (sub2) {
        var top = base.height - baseShift;
        finalGroup = makeVList({
          positionType: "top",
          positionData: top,
          children: [{
            type: "kern",
            size: options.fontMetrics().bigOpSpacing5
          }, {
            type: "elem",
            elem: sub2.elem,
            marginLeft: makeEm(-slant)
          }, {
            type: "kern",
            size: sub2.kern
          }, {
            type: "elem",
            elem: base
          }]
        });
      } else if (sup2) {
        var _bottom = base.depth + baseShift;
        finalGroup = makeVList({
          positionType: "bottom",
          positionData: _bottom,
          children: [{
            type: "elem",
            elem: base
          }, {
            type: "kern",
            size: sup2.kern
          }, {
            type: "elem",
            elem: sup2.elem,
            marginLeft: makeEm(slant)
          }, {
            type: "kern",
            size: options.fontMetrics().bigOpSpacing5
          }]
        });
      } else {
        return base;
      }
      var parts = [finalGroup];
      if (sub2 && slant !== 0 && !subIsSingleCharacter) {
        var spacer = makeSpan(["mspace"], [], options);
        spacer.style.marginRight = makeEm(slant);
        parts.unshift(spacer);
      }
      return makeSpan(["mop", "op-limits"], parts, options);
    };
    var noSuccessor = /* @__PURE__ */ new Set(["\\smallint"]);
    var htmlBuilder$2 = (grp, options) => {
      var supGroup;
      var subGroup;
      var hasLimits = false;
      var group;
      if (grp.type === "supsub") {
        supGroup = grp.sup;
        subGroup = grp.sub;
        group = assertNodeType(grp.base, "op");
        hasLimits = true;
      } else {
        group = assertNodeType(grp, "op");
      }
      var style = options.style;
      var large = false;
      if (style.size === Style$1.DISPLAY.size && group.symbol && !noSuccessor.has(group.name)) {
        large = true;
      }
      var base;
      var symbolItalic;
      if (group.symbol) {
        var fontName = large ? "Size2-Regular" : "Size1-Regular";
        var stash = "";
        if (group.name === "\\oiint" || group.name === "\\oiiint") {
          stash = group.name.slice(1);
          group.name = stash === "oiint" ? "\\iint" : "\\iiint";
        }
        base = makeSymbol(group.name, fontName, "math", options, ["mop", "op-symbol", large ? "large-op" : "small-op"]);
        symbolItalic = base.italic;
        if (stash.length > 0) {
          var oval = staticSvg(stash + "Size" + (large ? "2" : "1"), options);
          base = makeVList({
            positionType: "individualShift",
            children: [{
              type: "elem",
              elem: base,
              shift: 0
            }, {
              type: "elem",
              elem: oval,
              shift: large ? 0.08 : 0
            }]
          });
          group.name = "\\" + stash;
          base.classes.unshift("mop");
          base.italic = symbolItalic;
        }
      } else if (group.body) {
        var inner2 = buildExpression$1(group.body, options, true);
        if (inner2.length === 1 && inner2[0] instanceof SymbolNode) {
          base = inner2[0];
          base.classes[0] = "mop";
        } else {
          base = makeSpan(["mop"], inner2, options);
        }
      } else {
        var output = [];
        for (var i = 1; i < group.name.length; i++) {
          output.push(mathsym(group.name[i], group.mode, options));
        }
        base = makeSpan(["mop"], output, options);
      }
      var baseShift = 0;
      var slant = 0;
      if ((base instanceof SymbolNode || group.name === "\\oiint" || group.name === "\\oiiint") && !group.suppressBaseShift) {
        var _base$italic;
        baseShift = (base.height - base.depth) / 2 - options.fontMetrics().axisHeight;
        slant = (_base$italic = base.italic) != null ? _base$italic : 0;
      }
      if (hasLimits) {
        return assembleSupSub(base, supGroup, subGroup, options, style, slant, baseShift);
      } else {
        if (baseShift) {
          base.style.position = "relative";
          base.style.top = makeEm(baseShift);
        }
        return base;
      }
    };
    var mathmlBuilder$1 = (group, options) => {
      var node;
      if (group.symbol) {
        node = new MathNode("mo", [makeText(group.name, group.mode)]);
        if (noSuccessor.has(group.name)) {
          node.setAttribute("largeop", "false");
        }
      } else if (group.body) {
        node = new MathNode("mo", buildExpression2(group.body, options));
      } else {
        node = new MathNode("mi", [new TextNode(group.name.slice(1))]);
        var operator = new MathNode("mo", [makeText("\u2061", "text")]);
        if (group.parentIsSupSub) {
          node = new MathNode("mrow", [node, operator]);
        } else {
          node = newDocumentFragment([node, operator]);
        }
      }
      return node;
    };
    var singleCharBigOps = {
      "\u220F": "\\prod",
      "\u2210": "\\coprod",
      "\u2211": "\\sum",
      "\u22C0": "\\bigwedge",
      "\u22C1": "\\bigvee",
      "\u22C2": "\\bigcap",
      "\u22C3": "\\bigcup",
      "\u2A00": "\\bigodot",
      "\u2A01": "\\bigoplus",
      "\u2A02": "\\bigotimes",
      "\u2A04": "\\biguplus",
      "\u2A06": "\\bigsqcup"
    };
    defineFunction({
      type: "op",
      names: ["\\coprod", "\\bigvee", "\\bigwedge", "\\biguplus", "\\bigcap", "\\bigcup", "\\intop", "\\prod", "\\sum", "\\bigotimes", "\\bigoplus", "\\bigodot", "\\bigsqcup", "\\smallint", "\u220F", "\u2210", "\u2211", "\u22C0", "\u22C1", "\u22C2", "\u22C3", "\u2A00", "\u2A01", "\u2A02", "\u2A04", "\u2A06"],
      props: {
        numArgs: 0
      },
      handler: (_ref, args) => {
        var {
          parser,
          funcName
        } = _ref;
        var fName = funcName;
        if (fName.length === 1) {
          fName = singleCharBigOps[fName];
        }
        return {
          type: "op",
          mode: parser.mode,
          limits: true,
          parentIsSupSub: false,
          symbol: true,
          name: fName
        };
      },
      htmlBuilder: htmlBuilder$2,
      mathmlBuilder: mathmlBuilder$1
    });
    defineFunction({
      type: "op",
      names: ["\\mathop"],
      props: {
        numArgs: 1,
        primitive: true
      },
      handler: (_ref2, args) => {
        var {
          parser
        } = _ref2;
        var body = args[0];
        return {
          type: "op",
          mode: parser.mode,
          limits: false,
          parentIsSupSub: false,
          symbol: false,
          body: ordargument(body)
        };
      },
      htmlBuilder: htmlBuilder$2,
      mathmlBuilder: mathmlBuilder$1
    });
    var singleCharIntegrals = {
      "\u222B": "\\int",
      "\u222C": "\\iint",
      "\u222D": "\\iiint",
      "\u222E": "\\oint",
      "\u222F": "\\oiint",
      "\u2230": "\\oiiint"
    };
    defineFunction({
      type: "op",
      names: ["\\arcsin", "\\arccos", "\\arctan", "\\arctg", "\\arcctg", "\\arg", "\\ch", "\\cos", "\\cosec", "\\cosh", "\\cot", "\\cotg", "\\coth", "\\csc", "\\ctg", "\\cth", "\\deg", "\\dim", "\\exp", "\\hom", "\\ker", "\\lg", "\\ln", "\\log", "\\sec", "\\sin", "\\sinh", "\\sh", "\\tan", "\\tanh", "\\tg", "\\th"],
      props: {
        numArgs: 0
      },
      handler(_ref3) {
        var {
          parser,
          funcName
        } = _ref3;
        return {
          type: "op",
          mode: parser.mode,
          limits: false,
          parentIsSupSub: false,
          symbol: false,
          name: funcName
        };
      },
      htmlBuilder: htmlBuilder$2,
      mathmlBuilder: mathmlBuilder$1
    });
    defineFunction({
      type: "op",
      names: ["\\det", "\\gcd", "\\inf", "\\lim", "\\max", "\\min", "\\Pr", "\\sup"],
      props: {
        numArgs: 0
      },
      handler(_ref4) {
        var {
          parser,
          funcName
        } = _ref4;
        return {
          type: "op",
          mode: parser.mode,
          limits: true,
          parentIsSupSub: false,
          symbol: false,
          name: funcName
        };
      },
      htmlBuilder: htmlBuilder$2,
      mathmlBuilder: mathmlBuilder$1
    });
    defineFunction({
      type: "op",
      names: ["\\int", "\\iint", "\\iiint", "\\oint", "\\oiint", "\\oiiint", "\u222B", "\u222C", "\u222D", "\u222E", "\u222F", "\u2230"],
      props: {
        numArgs: 0,
        allowedInArgument: true
      },
      handler(_ref5) {
        var {
          parser,
          funcName
        } = _ref5;
        var fName = funcName;
        if (fName.length === 1) {
          fName = singleCharIntegrals[fName];
        }
        return {
          type: "op",
          mode: parser.mode,
          limits: false,
          parentIsSupSub: false,
          symbol: true,
          name: fName
        };
      },
      htmlBuilder: htmlBuilder$2,
      mathmlBuilder: mathmlBuilder$1
    });
    var htmlBuilder$1 = (grp, options) => {
      var supGroup;
      var subGroup;
      var hasLimits = false;
      var group;
      if (grp.type === "supsub") {
        supGroup = grp.sup;
        subGroup = grp.sub;
        group = assertNodeType(grp.base, "operatorname");
        hasLimits = true;
      } else {
        group = assertNodeType(grp, "operatorname");
      }
      var base;
      if (group.body.length > 0) {
        var body = group.body.map((child2) => {
          var childText = "text" in child2 ? child2.text : void 0;
          if (typeof childText === "string") {
            return {
              type: "textord",
              mode: child2.mode,
              text: childText
            };
          } else {
            return child2;
          }
        });
        var expression = buildExpression$1(body, options.withFont("mathrm"), true);
        for (var i = 0; i < expression.length; i++) {
          var child = expression[i];
          if (child instanceof SymbolNode) {
            child.text = child.text.replace(/\u2212/, "-").replace(/\u2217/, "*");
          }
        }
        base = makeSpan(["mop"], expression, options);
      } else {
        base = makeSpan(["mop"], [], options);
      }
      if (hasLimits) {
        return assembleSupSub(base, supGroup, subGroup, options, options.style, 0, 0);
      } else {
        return base;
      }
    };
    var mathmlBuilder2 = (group, options) => {
      var expression = buildExpression2(group.body, options.withFont("mathrm"));
      var isAllString = true;
      for (var i = 0; i < expression.length; i++) {
        var node = expression[i];
        if (node instanceof SpaceNode) ;
        else if (node instanceof MathNode) {
          switch (node.type) {
            case "mi":
            case "mn":
            case "mspace":
            case "mtext":
              break;
            // Do nothing yet.
            case "mo": {
              var child = node.children[0];
              if (node.children.length === 1 && child instanceof TextNode) {
                child.text = child.text.replace(/\u2212/, "-").replace(/\u2217/, "*");
              } else {
                isAllString = false;
              }
              break;
            }
            default:
              isAllString = false;
          }
        } else {
          isAllString = false;
        }
      }
      if (isAllString) {
        var word = expression.map((node2) => node2.toText()).join("");
        expression = [new TextNode(word)];
      }
      var identifier = new MathNode("mi", expression);
      identifier.setAttribute("mathvariant", "normal");
      var operator = new MathNode("mo", [makeText("\u2061", "text")]);
      if (group.parentIsSupSub) {
        return new MathNode("mrow", [identifier, operator]);
      } else {
        return newDocumentFragment([identifier, operator]);
      }
    };
    defineFunction({
      type: "operatorname",
      names: ["\\operatorname@", "\\operatornamewithlimits"],
      props: {
        numArgs: 1
      },
      handler: (_ref, args) => {
        var {
          parser,
          funcName
        } = _ref;
        var body = args[0];
        return {
          type: "operatorname",
          mode: parser.mode,
          body: ordargument(body),
          alwaysHandleSupSub: funcName === "\\operatornamewithlimits",
          limits: false,
          parentIsSupSub: false
        };
      },
      htmlBuilder: htmlBuilder$1,
      mathmlBuilder: mathmlBuilder2
    });
    defineMacro("\\operatorname", "\\@ifstar\\operatornamewithlimits\\operatorname@");
    defineFunctionBuilders({
      type: "ordgroup",
      htmlBuilder(group, options) {
        if (group.semisimple) {
          return makeFragment(buildExpression$1(group.body, options, false));
        }
        return makeSpan(["mord"], buildExpression$1(group.body, options, true), options);
      },
      mathmlBuilder(group, options) {
        return buildExpressionRow(group.body, options, true);
      }
    });
    defineFunction({
      type: "overline",
      names: ["\\overline"],
      props: {
        numArgs: 1
      },
      handler(_ref, args) {
        var {
          parser
        } = _ref;
        var body = args[0];
        return {
          type: "overline",
          mode: parser.mode,
          body
        };
      },
      htmlBuilder(group, options) {
        var innerGroup = buildGroup$1(group.body, options.havingCrampedStyle());
        var line = makeLineSpan("overline-line", options);
        var defaultRuleThickness = options.fontMetrics().defaultRuleThickness;
        var vlist = makeVList({
          positionType: "firstBaseline",
          children: [{
            type: "elem",
            elem: innerGroup
          }, {
            type: "kern",
            size: 3 * defaultRuleThickness
          }, {
            type: "elem",
            elem: line
          }, {
            type: "kern",
            size: defaultRuleThickness
          }]
        });
        return makeSpan(["mord", "overline"], [vlist], options);
      },
      mathmlBuilder(group, options) {
        var operator = new MathNode("mo", [new TextNode("\u203E")]);
        operator.setAttribute("stretchy", "true");
        var node = new MathNode("mover", [buildGroup2(group.body, options), operator]);
        node.setAttribute("accent", "true");
        return node;
      }
    });
    defineFunction({
      type: "phantom",
      names: ["\\phantom"],
      props: {
        numArgs: 1,
        allowedInText: true
      },
      handler: (_ref, args) => {
        var {
          parser
        } = _ref;
        var body = args[0];
        return {
          type: "phantom",
          mode: parser.mode,
          body: ordargument(body)
        };
      },
      htmlBuilder: (group, options) => {
        var elements = buildExpression$1(group.body, options.withPhantom(), false);
        return makeFragment(elements);
      },
      mathmlBuilder: (group, options) => {
        var inner2 = buildExpression2(group.body, options);
        return new MathNode("mphantom", inner2);
      }
    });
    defineMacro("\\hphantom", "\\smash{\\phantom{#1}}");
    defineFunction({
      type: "vphantom",
      names: ["\\vphantom"],
      props: {
        numArgs: 1,
        allowedInText: true
      },
      handler: (_ref2, args) => {
        var {
          parser
        } = _ref2;
        var body = args[0];
        return {
          type: "vphantom",
          mode: parser.mode,
          body
        };
      },
      htmlBuilder: (group, options) => {
        var inner2 = makeSpan(["inner"], [buildGroup$1(group.body, options.withPhantom())]);
        var fix = makeSpan(["fix"], []);
        return makeSpan(["mord", "rlap"], [inner2, fix], options);
      },
      mathmlBuilder: (group, options) => {
        var inner2 = buildExpression2(ordargument(group.body), options);
        var phantom = new MathNode("mphantom", inner2);
        var node = new MathNode("mpadded", [phantom]);
        node.setAttribute("width", "0px");
        return node;
      }
    });
    defineFunction({
      type: "raisebox",
      names: ["\\raisebox"],
      props: {
        numArgs: 2,
        argTypes: ["size", "hbox"],
        allowedInText: true
      },
      handler(_ref, args) {
        var {
          parser
        } = _ref;
        var amount = assertNodeType(args[0], "size").value;
        var body = args[1];
        return {
          type: "raisebox",
          mode: parser.mode,
          dy: amount,
          body
        };
      },
      htmlBuilder(group, options) {
        var body = buildGroup$1(group.body, options);
        var dy = calculateSize(group.dy, options);
        return makeVList({
          positionType: "shift",
          positionData: -dy,
          children: [{
            type: "elem",
            elem: body
          }]
        });
      },
      mathmlBuilder(group, options) {
        var node = new MathNode("mpadded", [buildGroup2(group.body, options)]);
        var dy = group.dy.number + group.dy.unit;
        node.setAttribute("voffset", dy);
        return node;
      }
    });
    defineFunction({
      type: "internal",
      names: ["\\relax"],
      props: {
        numArgs: 0,
        allowedInText: true,
        allowedInArgument: true
      },
      handler(_ref) {
        var {
          parser
        } = _ref;
        return {
          type: "internal",
          mode: parser.mode
        };
      }
    });
    defineFunction({
      type: "rule",
      names: ["\\rule"],
      props: {
        numArgs: 2,
        numOptionalArgs: 1,
        allowedInText: true,
        allowedInMath: true,
        argTypes: ["size", "size", "size"]
      },
      handler(_ref, args, optArgs) {
        var {
          parser
        } = _ref;
        var shift = optArgs[0];
        var width = assertNodeType(args[0], "size");
        var height = assertNodeType(args[1], "size");
        return {
          type: "rule",
          mode: parser.mode,
          shift: shift && assertNodeType(shift, "size").value,
          width: width.value,
          height: height.value
        };
      },
      htmlBuilder(group, options) {
        var rule = makeSpan(["mord", "rule"], [], options);
        var width = calculateSize(group.width, options);
        var height = calculateSize(group.height, options);
        var shift = group.shift ? calculateSize(group.shift, options) : 0;
        rule.style.borderRightWidth = makeEm(width);
        rule.style.borderTopWidth = makeEm(height);
        rule.style.bottom = makeEm(shift);
        rule.width = width;
        rule.height = height + shift;
        rule.depth = -shift;
        rule.maxFontSize = height * 1.125 * options.sizeMultiplier;
        return rule;
      },
      mathmlBuilder(group, options) {
        var width = calculateSize(group.width, options);
        var height = calculateSize(group.height, options);
        var shift = group.shift ? calculateSize(group.shift, options) : 0;
        var color = options.color && options.getColor() || "black";
        var rule = new MathNode("mspace");
        rule.setAttribute("mathbackground", color);
        rule.setAttribute("width", makeEm(width));
        rule.setAttribute("height", makeEm(height));
        var wrapper = new MathNode("mpadded", [rule]);
        if (shift >= 0) {
          wrapper.setAttribute("height", makeEm(shift));
        } else {
          wrapper.setAttribute("height", makeEm(shift));
          wrapper.setAttribute("depth", makeEm(-shift));
        }
        wrapper.setAttribute("voffset", makeEm(shift));
        return wrapper;
      }
    });
    function sizingGroup(value, options, baseOptions) {
      var inner2 = buildExpression$1(value, options, false);
      var multiplier = options.sizeMultiplier / baseOptions.sizeMultiplier;
      for (var i = 0; i < inner2.length; i++) {
        var pos = inner2[i].classes.indexOf("sizing");
        if (pos < 0) {
          Array.prototype.push.apply(inner2[i].classes, options.sizingClasses(baseOptions));
        } else if (inner2[i].classes[pos + 1] === "reset-size" + options.size) {
          inner2[i].classes[pos + 1] = "reset-size" + baseOptions.size;
        }
        inner2[i].height *= multiplier;
        inner2[i].depth *= multiplier;
      }
      return makeFragment(inner2);
    }
    var sizeFuncs = ["\\tiny", "\\sixptsize", "\\scriptsize", "\\footnotesize", "\\small", "\\normalsize", "\\large", "\\Large", "\\LARGE", "\\huge", "\\Huge"];
    var htmlBuilder2 = (group, options) => {
      var newOptions = options.havingSize(group.size);
      return sizingGroup(group.body, newOptions, options);
    };
    defineFunction({
      type: "sizing",
      names: sizeFuncs,
      props: {
        numArgs: 0,
        allowedInText: true
      },
      handler: (_ref, args) => {
        var {
          breakOnTokenText,
          funcName,
          parser
        } = _ref;
        var body = parser.parseExpression(false, breakOnTokenText);
        return {
          type: "sizing",
          mode: parser.mode,
          // Figure out what size to use based on the list of functions above
          size: sizeFuncs.indexOf(funcName) + 1,
          body
        };
      },
      htmlBuilder: htmlBuilder2,
      mathmlBuilder: (group, options) => {
        var newOptions = options.havingSize(group.size);
        var inner2 = buildExpression2(group.body, newOptions);
        var node = new MathNode("mstyle", inner2);
        node.setAttribute("mathsize", makeEm(newOptions.sizeMultiplier));
        return node;
      }
    });
    defineFunction({
      type: "smash",
      names: ["\\smash"],
      props: {
        numArgs: 1,
        numOptionalArgs: 1,
        allowedInText: true
      },
      handler: (_ref, args, optArgs) => {
        var {
          parser
        } = _ref;
        var smashHeight = false;
        var smashDepth = false;
        var tbArg = optArgs[0] && assertNodeType(optArgs[0], "ordgroup");
        if (tbArg) {
          var letter;
          for (var i = 0; i < tbArg.body.length; ++i) {
            var node = tbArg.body[i];
            letter = assertSymbolNodeType(node).text;
            if (letter === "t") {
              smashHeight = true;
            } else if (letter === "b") {
              smashDepth = true;
            } else {
              smashHeight = false;
              smashDepth = false;
              break;
            }
          }
        } else {
          smashHeight = true;
          smashDepth = true;
        }
        var body = args[0];
        return {
          type: "smash",
          mode: parser.mode,
          body,
          smashHeight,
          smashDepth
        };
      },
      htmlBuilder: (group, options) => {
        var node = makeSpan([], [buildGroup$1(group.body, options)]);
        if (!group.smashHeight && !group.smashDepth) {
          return node;
        }
        if (group.smashHeight) {
          node.height = 0;
        }
        if (group.smashDepth) {
          node.depth = 0;
        }
        if (group.smashHeight && group.smashDepth) {
          return makeSpan(["mord", "smash"], [node], options);
        }
        if (node.children) {
          for (var i = 0; i < node.children.length; i++) {
            if (group.smashHeight) {
              node.children[i].height = 0;
            }
            if (group.smashDepth) {
              node.children[i].depth = 0;
            }
          }
        }
        var smashedNode = makeVList({
          positionType: "firstBaseline",
          children: [{
            type: "elem",
            elem: node
          }]
        });
        return makeSpan(["mord"], [smashedNode], options);
      },
      mathmlBuilder: (group, options) => {
        var node = new MathNode("mpadded", [buildGroup2(group.body, options)]);
        if (group.smashHeight) {
          node.setAttribute("height", "0px");
        }
        if (group.smashDepth) {
          node.setAttribute("depth", "0px");
        }
        return node;
      }
    });
    defineFunction({
      type: "sqrt",
      names: ["\\sqrt"],
      props: {
        numArgs: 1,
        numOptionalArgs: 1
      },
      handler(_ref, args, optArgs) {
        var {
          parser
        } = _ref;
        var index = optArgs[0];
        var body = args[0];
        return {
          type: "sqrt",
          mode: parser.mode,
          body,
          index
        };
      },
      htmlBuilder(group, options) {
        var inner2 = buildGroup$1(group.body, options.havingCrampedStyle());
        if (inner2.height === 0) {
          inner2.height = options.fontMetrics().xHeight;
        }
        inner2 = wrapFragment(inner2, options);
        var metrics = options.fontMetrics();
        var theta = metrics.defaultRuleThickness;
        var phi = theta;
        if (options.style.id < Style$1.TEXT.id) {
          phi = options.fontMetrics().xHeight;
        }
        var lineClearance = theta + phi / 4;
        var minDelimiterHeight = inner2.height + inner2.depth + lineClearance + theta;
        var {
          span: img,
          ruleWidth,
          advanceWidth
        } = makeSqrtImage(minDelimiterHeight, options);
        var delimDepth = img.height - ruleWidth;
        if (delimDepth > inner2.height + inner2.depth + lineClearance) {
          lineClearance = (lineClearance + delimDepth - inner2.height - inner2.depth) / 2;
        }
        var imgShift = img.height - inner2.height - lineClearance - ruleWidth;
        inner2.style.paddingLeft = makeEm(advanceWidth);
        var body = makeVList({
          positionType: "firstBaseline",
          children: [{
            type: "elem",
            elem: inner2,
            wrapperClasses: ["svg-align"]
          }, {
            type: "kern",
            size: -(inner2.height + imgShift)
          }, {
            type: "elem",
            elem: img
          }, {
            type: "kern",
            size: ruleWidth
          }]
        });
        if (!group.index) {
          return makeSpan(["mord", "sqrt"], [body], options);
        } else {
          var newOptions = options.havingStyle(Style$1.SCRIPTSCRIPT);
          var rootm = buildGroup$1(group.index, newOptions, options);
          var toShift = 0.6 * (body.height - body.depth);
          var rootVList = makeVList({
            positionType: "shift",
            positionData: -toShift,
            children: [{
              type: "elem",
              elem: rootm
            }]
          });
          var rootVListWrap = makeSpan(["root"], [rootVList]);
          return makeSpan(["mord", "sqrt"], [rootVListWrap, body], options);
        }
      },
      mathmlBuilder(group, options) {
        var {
          body,
          index
        } = group;
        return index ? new MathNode("mroot", [buildGroup2(body, options), buildGroup2(index, options)]) : new MathNode("msqrt", [buildGroup2(body, options)]);
      }
    });
    var styleMap = {
      "display": Style$1.DISPLAY,
      "text": Style$1.TEXT,
      "script": Style$1.SCRIPT,
      "scriptscript": Style$1.SCRIPTSCRIPT
    };
    function isStyleStr(s) {
      return s in styleMap;
    }
    defineFunction({
      type: "styling",
      names: ["\\displaystyle", "\\textstyle", "\\scriptstyle", "\\scriptscriptstyle"],
      props: {
        numArgs: 0,
        allowedInText: true,
        primitive: true
      },
      handler(_ref, args) {
        var {
          breakOnTokenText,
          funcName,
          parser
        } = _ref;
        var body = parser.parseExpression(true, breakOnTokenText);
        var style = funcName.slice(1, funcName.length - 5);
        if (!isStyleStr(style)) {
          throw new Error("Unknown style: " + style);
        }
        return {
          type: "styling",
          mode: parser.mode,
          // Figure out what style to use by pulling out the style from
          // the function name
          style,
          body
        };
      },
      htmlBuilder(group, options) {
        var newStyle = styleMap[group.style];
        var newOptions = options.havingStyle(newStyle);
        if (group.resetFont) {
          newOptions = newOptions.withFont("");
        }
        return sizingGroup(group.body, newOptions, options);
      },
      mathmlBuilder(group, options) {
        var newStyle = styleMap[group.style];
        var newOptions = options.havingStyle(newStyle);
        if (group.resetFont) {
          newOptions = newOptions.withFont("");
        }
        var inner2 = buildExpression2(group.body, newOptions);
        var node = new MathNode("mstyle", inner2);
        var styleAttributes = {
          "display": ["0", "true"],
          "text": ["0", "false"],
          "script": ["1", "false"],
          "scriptscript": ["2", "false"]
        };
        var attr = styleAttributes[group.style];
        node.setAttribute("scriptlevel", attr[0]);
        node.setAttribute("displaystyle", attr[1]);
        return node;
      }
    });
    var htmlBuilderDelegate = function htmlBuilderDelegate2(group, options) {
      var base = group.base;
      if (!base) {
        return null;
      } else if (base.type === "op") {
        var delegate = base.limits && (options.style.size === Style$1.DISPLAY.size || base.alwaysHandleSupSub);
        return delegate ? htmlBuilder$2 : null;
      } else if (base.type === "operatorname") {
        var _delegate = base.alwaysHandleSupSub && (options.style.size === Style$1.DISPLAY.size || base.limits);
        return _delegate ? htmlBuilder$1 : null;
      } else if (base.type === "accent") {
        return isCharacterBox(base.base) ? htmlBuilder$a : null;
      } else if (base.type === "horizBrace") {
        var isSup = !group.sub;
        return isSup === base.isOver ? htmlBuilder$3 : null;
      } else {
        return null;
      }
    };
    defineFunctionBuilders({
      type: "supsub",
      htmlBuilder(group, options) {
        var builderDelegate = htmlBuilderDelegate(group, options);
        if (builderDelegate) {
          return builderDelegate(group, options);
        }
        var {
          base: valueBase,
          sup: valueSup,
          sub: valueSub
        } = group;
        var base = buildGroup$1(valueBase, options);
        var supm;
        var subm;
        var metrics = options.fontMetrics();
        var supShift = 0;
        var subShift = 0;
        var isCharBox = valueBase && isCharacterBox(valueBase);
        if (valueSup) {
          var newOptions = options.havingStyle(options.style.sup());
          supm = buildGroup$1(valueSup, newOptions, options);
          if (!isCharBox) {
            supShift = base.height - newOptions.fontMetrics().supDrop * newOptions.sizeMultiplier / options.sizeMultiplier;
          }
        }
        if (valueSub) {
          var _newOptions = options.havingStyle(options.style.sub());
          subm = buildGroup$1(valueSub, _newOptions, options);
          if (!isCharBox) {
            subShift = base.depth + _newOptions.fontMetrics().subDrop * _newOptions.sizeMultiplier / options.sizeMultiplier;
          }
        }
        var minSupShift;
        if (options.style === Style$1.DISPLAY) {
          minSupShift = metrics.sup1;
        } else if (options.style.cramped) {
          minSupShift = metrics.sup3;
        } else {
          minSupShift = metrics.sup2;
        }
        var multiplier = options.sizeMultiplier;
        var marginRight = makeEm(0.5 / metrics.ptPerEm / multiplier);
        var marginLeft = null;
        if (subm) {
          var isOiint = group.base && group.base.type === "op" && group.base.name && (group.base.name === "\\oiint" || group.base.name === "\\oiiint");
          if (base instanceof SymbolNode || isOiint) {
            var _base$italic;
            marginLeft = makeEm(-((_base$italic = base.italic) != null ? _base$italic : 0));
          }
        }
        var supsub;
        if (supm && subm) {
          supShift = Math.max(supShift, minSupShift, supm.depth + 0.25 * metrics.xHeight);
          subShift = Math.max(subShift, metrics.sub2);
          var ruleWidth = metrics.defaultRuleThickness;
          var maxWidth = 4 * ruleWidth;
          if (supShift - supm.depth - (subm.height - subShift) < maxWidth) {
            subShift = maxWidth - (supShift - supm.depth) + subm.height;
            var psi = 0.8 * metrics.xHeight - (supShift - supm.depth);
            if (psi > 0) {
              supShift += psi;
              subShift -= psi;
            }
          }
          var vlistElem = [{
            type: "elem",
            elem: subm,
            shift: subShift,
            marginRight,
            marginLeft
          }, {
            type: "elem",
            elem: supm,
            shift: -supShift,
            marginRight
          }];
          supsub = makeVList({
            positionType: "individualShift",
            children: vlistElem
          });
        } else if (subm) {
          subShift = Math.max(subShift, metrics.sub1, subm.height - 0.8 * metrics.xHeight);
          var _vlistElem = [{
            type: "elem",
            elem: subm,
            marginLeft,
            marginRight
          }];
          supsub = makeVList({
            positionType: "shift",
            positionData: subShift,
            children: _vlistElem
          });
        } else if (supm) {
          supShift = Math.max(supShift, minSupShift, supm.depth + 0.25 * metrics.xHeight);
          supsub = makeVList({
            positionType: "shift",
            positionData: -supShift,
            children: [{
              type: "elem",
              elem: supm,
              marginRight
            }]
          });
        } else {
          throw new Error("supsub must have either sup or sub.");
        }
        var mclass = getTypeOfDomTree(base, "right") || "mord";
        return makeSpan([mclass], [base, makeSpan(["msupsub"], [supsub])], options);
      },
      mathmlBuilder(group, options) {
        var isBrace = false;
        var isOver;
        var isSup;
        if (group.base && group.base.type === "horizBrace") {
          isSup = !!group.sup;
          if (isSup === group.base.isOver) {
            isBrace = true;
            isOver = group.base.isOver;
          }
        }
        if (group.base && (group.base.type === "op" || group.base.type === "operatorname")) {
          group.base.parentIsSupSub = true;
        }
        var children = [buildGroup2(group.base, options)];
        if (group.sub) {
          children.push(buildGroup2(group.sub, options));
        }
        if (group.sup) {
          children.push(buildGroup2(group.sup, options));
        }
        var nodeType;
        if (isBrace) {
          nodeType = isOver ? "mover" : "munder";
        } else if (!group.sub) {
          var base = group.base;
          if (base && base.type === "op" && base.limits && (options.style === Style$1.DISPLAY || base.alwaysHandleSupSub)) {
            nodeType = "mover";
          } else if (base && base.type === "operatorname" && base.alwaysHandleSupSub && (base.limits || options.style === Style$1.DISPLAY)) {
            nodeType = "mover";
          } else {
            nodeType = "msup";
          }
        } else if (!group.sup) {
          var _base = group.base;
          if (_base && _base.type === "op" && _base.limits && (options.style === Style$1.DISPLAY || _base.alwaysHandleSupSub)) {
            nodeType = "munder";
          } else if (_base && _base.type === "operatorname" && _base.alwaysHandleSupSub && (_base.limits || options.style === Style$1.DISPLAY)) {
            nodeType = "munder";
          } else {
            nodeType = "msub";
          }
        } else {
          var _base2 = group.base;
          if (_base2 && _base2.type === "op" && _base2.limits && options.style === Style$1.DISPLAY) {
            nodeType = "munderover";
          } else if (_base2 && _base2.type === "operatorname" && _base2.alwaysHandleSupSub && (options.style === Style$1.DISPLAY || _base2.limits)) {
            nodeType = "munderover";
          } else {
            nodeType = "msubsup";
          }
        }
        return new MathNode(nodeType, children);
      }
    });
    defineFunctionBuilders({
      type: "atom",
      htmlBuilder(group, options) {
        return mathsym(group.text, group.mode, options, ["m" + group.family]);
      },
      mathmlBuilder(group, options) {
        var node = new MathNode("mo", [makeText(group.text, group.mode)]);
        if (group.family === "bin") {
          var variant = getVariant(group, options);
          if (variant === "bold-italic") {
            node.setAttribute("mathvariant", variant);
          }
        } else if (group.family === "punct") {
          node.setAttribute("separator", "true");
        } else if (group.family === "open" || group.family === "close") {
          node.setAttribute("stretchy", "false");
        }
        return node;
      }
    });
    var defaultVariant = {
      "mi": "italic",
      "mn": "normal",
      "mtext": "normal"
    };
    defineFunctionBuilders({
      type: "mathord",
      htmlBuilder(group, options) {
        return makeOrd(group, options, "mathord");
      },
      mathmlBuilder(group, options) {
        var node = new MathNode("mi", [makeText(group.text, group.mode, options)]);
        var variant = getVariant(group, options) || "italic";
        if (variant !== defaultVariant[node.type]) {
          node.setAttribute("mathvariant", variant);
        }
        return node;
      }
    });
    defineFunctionBuilders({
      type: "textord",
      htmlBuilder(group, options) {
        return makeOrd(group, options, "textord");
      },
      mathmlBuilder(group, options) {
        var text2 = makeText(group.text, group.mode, options);
        var variant = getVariant(group, options) || "normal";
        var node;
        if (group.mode === "text") {
          node = new MathNode("mtext", [text2]);
        } else if (/[0-9]/.test(group.text)) {
          node = new MathNode("mn", [text2]);
        } else if (group.text === "\\prime") {
          node = new MathNode("mo", [text2]);
        } else {
          node = new MathNode("mi", [text2]);
        }
        if (variant !== defaultVariant[node.type]) {
          node.setAttribute("mathvariant", variant);
        }
        return node;
      }
    });
    var cssSpace = {
      "\\nobreak": "nobreak",
      "\\allowbreak": "allowbreak"
    };
    var regularSpace = {
      " ": {},
      "\\ ": {},
      "~": {
        className: "nobreak"
      },
      "\\space": {},
      "\\nobreakspace": {
        className: "nobreak"
      }
    };
    defineFunctionBuilders({
      type: "spacing",
      htmlBuilder(group, options) {
        if (regularSpace.hasOwnProperty(group.text)) {
          var className = regularSpace[group.text].className || "";
          if (group.mode === "text") {
            var ord = makeOrd(group, options, "textord");
            ord.classes.push(className);
            return ord;
          } else {
            return makeSpan(["mspace", className], [mathsym(group.text, group.mode, options)], options);
          }
        } else if (cssSpace.hasOwnProperty(group.text)) {
          return makeSpan(["mspace", cssSpace[group.text]], [], options);
        } else {
          throw new ParseError('Unknown type of space "' + group.text + '"');
        }
      },
      mathmlBuilder(group, options) {
        var node;
        if (regularSpace.hasOwnProperty(group.text)) {
          node = new MathNode("mtext", [new TextNode("\xA0")]);
        } else if (cssSpace.hasOwnProperty(group.text)) {
          return new MathNode("mspace");
        } else {
          throw new ParseError('Unknown type of space "' + group.text + '"');
        }
        return node;
      }
    });
    var pad = () => {
      var padNode = new MathNode("mtd", []);
      padNode.setAttribute("width", "50%");
      return padNode;
    };
    defineFunctionBuilders({
      type: "tag",
      mathmlBuilder(group, options) {
        var table = new MathNode("mtable", [new MathNode("mtr", [pad(), new MathNode("mtd", [buildExpressionRow(group.body, options)]), pad(), new MathNode("mtd", [buildExpressionRow(group.tag, options)])])]);
        table.setAttribute("width", "100%");
        return table;
      }
    });
    var textFontFamilies = {
      "\\text": void 0,
      "\\textrm": "textrm",
      "\\textsf": "textsf",
      "\\texttt": "texttt",
      "\\textnormal": "textrm"
    };
    var textFontWeights = {
      "\\textbf": "textbf",
      "\\textmd": "textmd"
    };
    var textFontShapes = {
      "\\textit": "textit",
      "\\textup": "textup"
    };
    var optionsWithFont = (group, options) => {
      var font = group.font;
      if (!font) {
        return options;
      } else if (textFontFamilies[font]) {
        return options.withTextFontFamily(textFontFamilies[font]);
      } else if (textFontWeights[font]) {
        return options.withTextFontWeight(textFontWeights[font]);
      } else if (font === "\\emph") {
        return options.fontShape === "textit" ? options.withTextFontShape("textup") : options.withTextFontShape("textit");
      }
      return options.withTextFontShape(textFontShapes[font]);
    };
    defineFunction({
      type: "text",
      names: [
        // Font families
        "\\text",
        "\\textrm",
        "\\textsf",
        "\\texttt",
        "\\textnormal",
        // Font weights
        "\\textbf",
        "\\textmd",
        // Font Shapes
        "\\textit",
        "\\textup",
        "\\emph"
      ],
      props: {
        numArgs: 1,
        argTypes: ["text"],
        allowedInArgument: true,
        allowedInText: true
      },
      handler(_ref, args) {
        var {
          parser,
          funcName
        } = _ref;
        var body = args[0];
        return {
          type: "text",
          mode: parser.mode,
          body: ordargument(body),
          font: funcName
        };
      },
      htmlBuilder(group, options) {
        var newOptions = optionsWithFont(group, options);
        var inner2 = buildExpression$1(group.body, newOptions, true);
        return makeSpan(["mord", "text"], inner2, newOptions);
      },
      mathmlBuilder(group, options) {
        var newOptions = optionsWithFont(group, options);
        return buildExpressionRow(group.body, newOptions);
      }
    });
    defineFunction({
      type: "underline",
      names: ["\\underline"],
      props: {
        numArgs: 1,
        allowedInText: true
      },
      handler(_ref, args) {
        var {
          parser
        } = _ref;
        return {
          type: "underline",
          mode: parser.mode,
          body: args[0]
        };
      },
      htmlBuilder(group, options) {
        var innerGroup = buildGroup$1(group.body, options);
        var line = makeLineSpan("underline-line", options);
        var defaultRuleThickness = options.fontMetrics().defaultRuleThickness;
        var vlist = makeVList({
          positionType: "top",
          positionData: innerGroup.height,
          children: [{
            type: "kern",
            size: defaultRuleThickness
          }, {
            type: "elem",
            elem: line
          }, {
            type: "kern",
            size: 3 * defaultRuleThickness
          }, {
            type: "elem",
            elem: innerGroup
          }]
        });
        return makeSpan(["mord", "underline"], [vlist], options);
      },
      mathmlBuilder(group, options) {
        var operator = new MathNode("mo", [new TextNode("\u203E")]);
        operator.setAttribute("stretchy", "true");
        var node = new MathNode("munder", [buildGroup2(group.body, options), operator]);
        node.setAttribute("accentunder", "true");
        return node;
      }
    });
    defineFunction({
      type: "vcenter",
      names: ["\\vcenter"],
      props: {
        numArgs: 1,
        argTypes: ["original"],
        // In LaTeX, \vcenter can act only on a box.
        allowedInText: false
      },
      handler(_ref, args) {
        var {
          parser
        } = _ref;
        return {
          type: "vcenter",
          mode: parser.mode,
          body: args[0]
        };
      },
      htmlBuilder(group, options) {
        var body = buildGroup$1(group.body, options);
        var axisHeight = options.fontMetrics().axisHeight;
        var dy = 0.5 * (body.height - axisHeight - (body.depth + axisHeight));
        return makeVList({
          positionType: "shift",
          positionData: dy,
          children: [{
            type: "elem",
            elem: body
          }]
        });
      },
      mathmlBuilder(group, options) {
        var mpadded = new MathNode("mpadded", [buildGroup2(group.body, options)], ["vcenter"]);
        return new MathNode("mrow", [mpadded]);
      }
    });
    defineFunction({
      type: "verb",
      names: ["\\verb"],
      props: {
        numArgs: 0,
        allowedInText: true
      },
      handler(context, args, optArgs) {
        throw new ParseError("\\verb ended by end of line instead of matching delimiter");
      },
      htmlBuilder(group, options) {
        var text2 = makeVerb(group);
        var body = [];
        var newOptions = options.havingStyle(options.style.text());
        for (var i = 0; i < text2.length; i++) {
          var c = text2[i];
          if (c === "~") {
            c = "\\textasciitilde";
          }
          body.push(makeSymbol(c, "Typewriter-Regular", group.mode, newOptions, ["mord", "texttt"]));
        }
        return makeSpan(["mord", "text"].concat(newOptions.sizingClasses(options)), tryCombineChars(body), newOptions);
      },
      mathmlBuilder(group, options) {
        var text2 = new TextNode(makeVerb(group));
        var node = new MathNode("mtext", [text2]);
        node.setAttribute("mathvariant", "monospace");
        return node;
      }
    });
    var makeVerb = (group) => group.body.replace(/ /g, group.star ? "\u2423" : "\xA0");
    var functions = _functions;
    var spaceRegexString = "[ \r\n	]";
    var controlWordRegexString = "\\\\[a-zA-Z@]+";
    var controlSymbolRegexString = "\\\\[^\uD800-\uDFFF]";
    var controlWordWhitespaceRegexString = "(" + controlWordRegexString + ")" + spaceRegexString + "*";
    var controlSpaceRegexString = "\\\\(\n|[ \r	]+\n?)[ \r	]*";
    var combiningDiacriticalMarkString = "[\u0300-\u036F]";
    var combiningDiacriticalMarksEndRegex = new RegExp(combiningDiacriticalMarkString + "+$");
    var tokenRegexString = "(" + spaceRegexString + "+)|" + // whitespace
    (controlSpaceRegexString + "|") + // \whitespace
    "([!-\\[\\]-\u2027\u202A-\uD7FF\uF900-\uFFFF]" + // single codepoint
    (combiningDiacriticalMarkString + "*") + // ...plus accents
    "|[\uD800-\uDBFF][\uDC00-\uDFFF]" + // surrogate pair
    (combiningDiacriticalMarkString + "*") + // ...plus accents
    "|\\\\verb\\*([^]).*?\\4|\\\\verb([^*a-zA-Z]).*?\\5" + // \verb unstarred
    ("|" + controlWordWhitespaceRegexString) + // \macroName + spaces
    ("|" + controlSymbolRegexString + ")");
    var Lexer = class {
      constructor(input, settings) {
        this.input = void 0;
        this.settings = void 0;
        this.tokenRegex = void 0;
        this.catcodes = void 0;
        this.input = input;
        this.settings = settings;
        this.tokenRegex = new RegExp(tokenRegexString, "g");
        this.catcodes = {
          "%": 14,
          // comment character
          "~": 13
          // active character
        };
      }
      setCatcode(char, code) {
        this.catcodes[char] = code;
      }
      /**
       * This function lexes a single token.
       */
      lex() {
        var input = this.input;
        var pos = this.tokenRegex.lastIndex;
        if (pos === input.length) {
          return new Token("EOF", new SourceLocation(this, pos, pos));
        }
        var match = this.tokenRegex.exec(input);
        if (match === null || match.index !== pos) {
          throw new ParseError("Unexpected character: '" + input[pos] + "'", new Token(input[pos], new SourceLocation(this, pos, pos + 1)));
        }
        var text2 = match[6] || match[3] || (match[2] ? "\\ " : " ");
        if (this.catcodes[text2] === 14) {
          var nlIndex = input.indexOf("\n", this.tokenRegex.lastIndex);
          if (nlIndex === -1) {
            this.tokenRegex.lastIndex = input.length;
            this.settings.reportNonstrict("commentAtEnd", "% comment has no terminating newline; LaTeX would fail because of commenting the end of math mode (e.g. $)");
          } else {
            this.tokenRegex.lastIndex = nlIndex + 1;
          }
          return this.lex();
        }
        return new Token(text2, new SourceLocation(this, pos, this.tokenRegex.lastIndex));
      }
    };
    var Namespace = class {
      /**
       * Both arguments are optional.  The first argument is an object of
       * built-in mappings which never change.  The second argument is an object
       * of initial (global-level) mappings, which will constantly change
       * according to any global/top-level `set`s done.
       */
      constructor(builtins, globalMacros) {
        if (builtins === void 0) {
          builtins = {};
        }
        if (globalMacros === void 0) {
          globalMacros = {};
        }
        this.current = void 0;
        this.builtins = void 0;
        this.undefStack = void 0;
        this.current = globalMacros;
        this.builtins = builtins;
        this.undefStack = [];
      }
      /**
       * Start a new nested group, affecting future local `set`s.
       */
      beginGroup() {
        this.undefStack.push({});
      }
      /**
       * End current nested group, restoring values before the group began.
       */
      endGroup() {
        if (this.undefStack.length === 0) {
          throw new ParseError("Unbalanced namespace destruction: attempt to pop global namespace; please report this as a bug");
        }
        var undefs = this.undefStack.pop();
        for (var undef in undefs) {
          if (undefs.hasOwnProperty(undef)) {
            if (undefs[undef] == null) {
              delete this.current[undef];
            } else {
              this.current[undef] = undefs[undef];
            }
          }
        }
      }
      /**
       * Ends all currently nested groups (if any), restoring values before the
       * groups began.  Useful in case of an error in the middle of parsing.
       */
      endGroups() {
        while (this.undefStack.length > 0) {
          this.endGroup();
        }
      }
      /**
       * Detect whether `name` has a definition.  Equivalent to
       * `get(name) != null`.
       */
      has(name2) {
        return this.current.hasOwnProperty(name2) || this.builtins.hasOwnProperty(name2);
      }
      /**
       * Get the current value of a name, or `undefined` if there is no value.
       *
       * Note: Do not use `if (namespace.get(...))` to detect whether a macro
       * is defined, as the definition may be the empty string which evaluates
       * to `false` in JavaScript.  Use `if (namespace.get(...) != null)` or
       * `if (namespace.has(...))`.
       */
      get(name2) {
        if (this.current.hasOwnProperty(name2)) {
          return this.current[name2];
        } else {
          return this.builtins[name2];
        }
      }
      /**
       * Set the current value of a name, and optionally set it globally too.
       * Local set() sets the current value and (when appropriate) adds an undo
       * operation to the undo stack.  Global set() may change the undo
       * operation at every level, so takes time linear in their number.
       * A value of undefined means to delete existing definitions.
       */
      set(name2, value, global) {
        if (global === void 0) {
          global = false;
        }
        if (global) {
          for (var i = 0; i < this.undefStack.length; i++) {
            delete this.undefStack[i][name2];
          }
          if (this.undefStack.length > 0) {
            this.undefStack[this.undefStack.length - 1][name2] = value;
          }
        } else {
          var top = this.undefStack[this.undefStack.length - 1];
          if (top && !top.hasOwnProperty(name2)) {
            top[name2] = this.current[name2];
          }
        }
        if (value == null) {
          delete this.current[name2];
        } else {
          this.current[name2] = value;
        }
      }
    };
    var macros = _macros;
    defineMacro("\\noexpand", function(context) {
      var t = context.popToken();
      if (context.isExpandable(t.text)) {
        t.noexpand = true;
        t.treatAsRelax = true;
      }
      return {
        tokens: [t],
        numArgs: 0
      };
    });
    defineMacro("\\expandafter", function(context) {
      var t = context.popToken();
      context.expandOnce(true);
      return {
        tokens: [t],
        numArgs: 0
      };
    });
    defineMacro("\\@firstoftwo", function(context) {
      var args = context.consumeArgs(2);
      return {
        tokens: args[0],
        numArgs: 0
      };
    });
    defineMacro("\\@secondoftwo", function(context) {
      var args = context.consumeArgs(2);
      return {
        tokens: args[1],
        numArgs: 0
      };
    });
    defineMacro("\\@ifnextchar", function(context) {
      var args = context.consumeArgs(3);
      context.consumeSpaces();
      var nextToken = context.future();
      if (args[0].length === 1 && args[0][0].text === nextToken.text) {
        return {
          tokens: args[1],
          numArgs: 0
        };
      } else {
        return {
          tokens: args[2],
          numArgs: 0
        };
      }
    });
    defineMacro("\\@ifstar", "\\@ifnextchar *{\\@firstoftwo{#1}}");
    defineMacro("\\TextOrMath", function(context) {
      var args = context.consumeArgs(2);
      if (context.mode === "text") {
        return {
          tokens: args[0],
          numArgs: 0
        };
      } else {
        return {
          tokens: args[1],
          numArgs: 0
        };
      }
    });
    var digitToNumber = {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "a": 10,
      "A": 10,
      "b": 11,
      "B": 11,
      "c": 12,
      "C": 12,
      "d": 13,
      "D": 13,
      "e": 14,
      "E": 14,
      "f": 15,
      "F": 15
    };
    defineMacro("\\char", function(context) {
      var token = context.popToken();
      var base;
      var number = 0;
      if (token.text === "'") {
        base = 8;
        token = context.popToken();
      } else if (token.text === '"') {
        base = 16;
        token = context.popToken();
      } else if (token.text === "`") {
        token = context.popToken();
        if (token.text[0] === "\\") {
          number = token.text.charCodeAt(1);
        } else if (token.text === "EOF") {
          throw new ParseError("\\char` missing argument");
        } else {
          number = token.text.charCodeAt(0);
        }
      } else {
        base = 10;
      }
      if (base) {
        number = digitToNumber[token.text];
        if (number == null || number >= base) {
          throw new ParseError("Invalid base-" + base + " digit " + token.text);
        }
        var digit;
        while ((digit = digitToNumber[context.future().text]) != null && digit < base) {
          number *= base;
          number += digit;
          context.popToken();
        }
      }
      return "\\@char{" + number + "}";
    });
    var newcommand = (context, existsOK, nonexistsOK, skipIfExists) => {
      var arg = context.consumeArg().tokens;
      if (arg.length !== 1) {
        throw new ParseError("\\newcommand's first argument must be a macro name");
      }
      var name2 = arg[0].text;
      var exists = context.isDefined(name2);
      if (exists && !existsOK) {
        throw new ParseError("\\newcommand{" + name2 + "} attempting to redefine " + (name2 + "; use \\renewcommand"));
      }
      if (!exists && !nonexistsOK) {
        throw new ParseError("\\renewcommand{" + name2 + "} when command " + name2 + " does not yet exist; use \\newcommand");
      }
      var numArgs = 0;
      arg = context.consumeArg().tokens;
      if (arg.length === 1 && arg[0].text === "[") {
        var argText = "";
        var token = context.expandNextToken();
        while (token.text !== "]" && token.text !== "EOF") {
          argText += token.text;
          token = context.expandNextToken();
        }
        if (!argText.match(/^\s*[0-9]+\s*$/)) {
          throw new ParseError("Invalid number of arguments: " + argText);
        }
        numArgs = parseInt(argText);
        arg = context.consumeArg().tokens;
      }
      if (!(exists && skipIfExists)) {
        context.macros.set(name2, {
          tokens: arg,
          numArgs
        });
      }
      return "";
    };
    defineMacro("\\newcommand", (context) => newcommand(context, false, true, false));
    defineMacro("\\renewcommand", (context) => newcommand(context, true, false, false));
    defineMacro("\\providecommand", (context) => newcommand(context, true, true, true));
    defineMacro("\\message", (context) => {
      var arg = context.consumeArgs(1)[0];
      console.log(arg.reverse().map((token) => token.text).join(""));
      return "";
    });
    defineMacro("\\errmessage", (context) => {
      var arg = context.consumeArgs(1)[0];
      console.error(arg.reverse().map((token) => token.text).join(""));
      return "";
    });
    defineMacro("\\show", (context) => {
      var tok = context.popToken();
      var name2 = tok.text;
      console.log(tok, context.macros.get(name2), functions[name2], symbols.math[name2], symbols.text[name2]);
      return "";
    });
    defineMacro("\\bgroup", "{");
    defineMacro("\\egroup", "}");
    defineMacro("~", "\\nobreakspace");
    defineMacro("\\lq", "`");
    defineMacro("\\rq", "'");
    defineMacro("\\aa", "\\r a");
    defineMacro("\\AA", "\\r A");
    defineMacro("\\textcopyright", "\\html@mathml{\\textcircled{c}}{\\char`\xA9}");
    defineMacro("\\copyright", "\\TextOrMath{\\textcopyright}{\\text{\\textcopyright}}");
    defineMacro("\\textregistered", "\\html@mathml{\\textcircled{\\scriptsize R}}{\\char`\xAE}");
    defineMacro("\u212C", "\\mathscr{B}");
    defineMacro("\u2130", "\\mathscr{E}");
    defineMacro("\u2131", "\\mathscr{F}");
    defineMacro("\u210B", "\\mathscr{H}");
    defineMacro("\u2110", "\\mathscr{I}");
    defineMacro("\u2112", "\\mathscr{L}");
    defineMacro("\u2133", "\\mathscr{M}");
    defineMacro("\u211B", "\\mathscr{R}");
    defineMacro("\u212D", "\\mathfrak{C}");
    defineMacro("\u210C", "\\mathfrak{H}");
    defineMacro("\u2128", "\\mathfrak{Z}");
    defineMacro("\\Bbbk", "\\Bbb{k}");
    defineMacro("\\llap", "\\mathllap{\\textrm{#1}}");
    defineMacro("\\rlap", "\\mathrlap{\\textrm{#1}}");
    defineMacro("\\clap", "\\mathclap{\\textrm{#1}}");
    defineMacro("\\mathstrut", "\\vphantom{(}");
    defineMacro("\\underbar", "\\underline{\\text{#1}}");
    defineMacro("\\not", '\\html@mathml{\\mathrel{\\mathrlap\\@not}\\nobreak}{\\char"338}');
    defineMacro("\\neq", "\\html@mathml{\\mathrel{\\not=}}{\\mathrel{\\char`\u2260}}");
    defineMacro("\\ne", "\\neq");
    defineMacro("\u2260", "\\neq");
    defineMacro("\\notin", "\\html@mathml{\\mathrel{{\\in}\\mathllap{/\\mskip1mu}}}{\\mathrel{\\char`\u2209}}");
    defineMacro("\u2209", "\\notin");
    defineMacro("\u2258", "\\html@mathml{\\mathrel{=\\kern{-1em}\\raisebox{0.4em}{$\\scriptsize\\frown$}}}{\\mathrel{\\char`\u2258}}");
    defineMacro("\u2259", "\\html@mathml{\\stackrel{\\tiny\\wedge}{=}}{\\mathrel{\\char`\u2258}}");
    defineMacro("\u225A", "\\html@mathml{\\stackrel{\\tiny\\vee}{=}}{\\mathrel{\\char`\u225A}}");
    defineMacro("\u225B", "\\html@mathml{\\stackrel{\\scriptsize\\star}{=}}{\\mathrel{\\char`\u225B}}");
    defineMacro("\u225D", "\\html@mathml{\\stackrel{\\tiny\\mathrm{def}}{=}}{\\mathrel{\\char`\u225D}}");
    defineMacro("\u225E", "\\html@mathml{\\stackrel{\\tiny\\mathrm{m}}{=}}{\\mathrel{\\char`\u225E}}");
    defineMacro("\u225F", "\\html@mathml{\\stackrel{\\tiny?}{=}}{\\mathrel{\\char`\u225F}}");
    defineMacro("\u27C2", "\\perp");
    defineMacro("\u203C", "\\mathclose{!\\mkern-0.8mu!}");
    defineMacro("\u220C", "\\notni");
    defineMacro("\u231C", "\\ulcorner");
    defineMacro("\u231D", "\\urcorner");
    defineMacro("\u231E", "\\llcorner");
    defineMacro("\u231F", "\\lrcorner");
    defineMacro("\xA9", "\\copyright");
    defineMacro("\xAE", "\\textregistered");
    defineMacro("\\ulcorner", '\\html@mathml{\\@ulcorner}{\\mathop{\\char"231c}}');
    defineMacro("\\urcorner", '\\html@mathml{\\@urcorner}{\\mathop{\\char"231d}}');
    defineMacro("\\llcorner", '\\html@mathml{\\@llcorner}{\\mathop{\\char"231e}}');
    defineMacro("\\lrcorner", '\\html@mathml{\\@lrcorner}{\\mathop{\\char"231f}}');
    defineMacro("\\vdots", "{\\varvdots\\rule{0pt}{15pt}}");
    defineMacro("\u22EE", "\\vdots");
    defineMacro("\\varGamma", "\\mathit{\\Gamma}");
    defineMacro("\\varDelta", "\\mathit{\\Delta}");
    defineMacro("\\varTheta", "\\mathit{\\Theta}");
    defineMacro("\\varLambda", "\\mathit{\\Lambda}");
    defineMacro("\\varXi", "\\mathit{\\Xi}");
    defineMacro("\\varPi", "\\mathit{\\Pi}");
    defineMacro("\\varSigma", "\\mathit{\\Sigma}");
    defineMacro("\\varUpsilon", "\\mathit{\\Upsilon}");
    defineMacro("\\varPhi", "\\mathit{\\Phi}");
    defineMacro("\\varPsi", "\\mathit{\\Psi}");
    defineMacro("\\varOmega", "\\mathit{\\Omega}");
    defineMacro("\\substack", "\\begin{subarray}{c}#1\\end{subarray}");
    defineMacro("\\colon", "\\nobreak\\mskip2mu\\mathpunct{}\\mathchoice{\\mkern-3mu}{\\mkern-3mu}{}{}{:}\\mskip6mu\\relax");
    defineMacro("\\boxed", "\\fbox{$\\displaystyle{#1}$}");
    defineMacro("\\iff", "\\DOTSB\\;\\Longleftrightarrow\\;");
    defineMacro("\\implies", "\\DOTSB\\;\\Longrightarrow\\;");
    defineMacro("\\impliedby", "\\DOTSB\\;\\Longleftarrow\\;");
    defineMacro("\\dddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ...}}{#1}}");
    defineMacro("\\ddddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ....}}{#1}}");
    var dotsByToken = {
      ",": "\\dotsc",
      "\\not": "\\dotsb",
      // \keybin@ checks for the following:
      "+": "\\dotsb",
      "=": "\\dotsb",
      "<": "\\dotsb",
      ">": "\\dotsb",
      "-": "\\dotsb",
      "*": "\\dotsb",
      ":": "\\dotsb",
      // Symbols whose definition starts with \DOTSB:
      "\\DOTSB": "\\dotsb",
      "\\coprod": "\\dotsb",
      "\\bigvee": "\\dotsb",
      "\\bigwedge": "\\dotsb",
      "\\biguplus": "\\dotsb",
      "\\bigcap": "\\dotsb",
      "\\bigcup": "\\dotsb",
      "\\prod": "\\dotsb",
      "\\sum": "\\dotsb",
      "\\bigotimes": "\\dotsb",
      "\\bigoplus": "\\dotsb",
      "\\bigodot": "\\dotsb",
      "\\bigsqcup": "\\dotsb",
      "\\And": "\\dotsb",
      "\\longrightarrow": "\\dotsb",
      "\\Longrightarrow": "\\dotsb",
      "\\longleftarrow": "\\dotsb",
      "\\Longleftarrow": "\\dotsb",
      "\\longleftrightarrow": "\\dotsb",
      "\\Longleftrightarrow": "\\dotsb",
      "\\mapsto": "\\dotsb",
      "\\longmapsto": "\\dotsb",
      "\\hookrightarrow": "\\dotsb",
      "\\doteq": "\\dotsb",
      // Symbols whose definition starts with \mathbin:
      "\\mathbin": "\\dotsb",
      // Symbols whose definition starts with \mathrel:
      "\\mathrel": "\\dotsb",
      "\\relbar": "\\dotsb",
      "\\Relbar": "\\dotsb",
      "\\xrightarrow": "\\dotsb",
      "\\xleftarrow": "\\dotsb",
      // Symbols whose definition starts with \DOTSI:
      "\\DOTSI": "\\dotsi",
      "\\int": "\\dotsi",
      "\\oint": "\\dotsi",
      "\\iint": "\\dotsi",
      "\\iiint": "\\dotsi",
      "\\iiiint": "\\dotsi",
      "\\idotsint": "\\dotsi",
      // Symbols whose definition starts with \DOTSX:
      "\\DOTSX": "\\dotsx"
    };
    var dotsbGroups = /* @__PURE__ */ new Set(["bin", "rel"]);
    defineMacro("\\dots", function(context) {
      var thedots = "\\dotso";
      var next = context.expandAfterFuture().text;
      if (next in dotsByToken) {
        thedots = dotsByToken[next];
      } else if (next.slice(0, 4) === "\\not") {
        thedots = "\\dotsb";
      } else if (next in symbols.math) {
        if (dotsbGroups.has(symbols.math[next].group)) {
          thedots = "\\dotsb";
        }
      }
      return thedots;
    });
    var spaceAfterDots = {
      // \rightdelim@ checks for the following:
      ")": true,
      "]": true,
      "\\rbrack": true,
      "\\}": true,
      "\\rbrace": true,
      "\\rangle": true,
      "\\rceil": true,
      "\\rfloor": true,
      "\\rgroup": true,
      "\\rmoustache": true,
      "\\right": true,
      "\\bigr": true,
      "\\biggr": true,
      "\\Bigr": true,
      "\\Biggr": true,
      // \extra@ also tests for the following:
      "$": true,
      // \extrap@ checks for the following:
      ";": true,
      ".": true,
      ",": true
    };
    defineMacro("\\dotso", function(context) {
      var next = context.future().text;
      if (next in spaceAfterDots) {
        return "\\ldots\\,";
      } else {
        return "\\ldots";
      }
    });
    defineMacro("\\dotsc", function(context) {
      var next = context.future().text;
      if (next in spaceAfterDots && next !== ",") {
        return "\\ldots\\,";
      } else {
        return "\\ldots";
      }
    });
    defineMacro("\\cdots", function(context) {
      var next = context.future().text;
      if (next in spaceAfterDots) {
        return "\\@cdots\\,";
      } else {
        return "\\@cdots";
      }
    });
    defineMacro("\\dotsb", "\\cdots");
    defineMacro("\\dotsm", "\\cdots");
    defineMacro("\\dotsi", "\\!\\cdots");
    defineMacro("\\dotsx", "\\ldots\\,");
    defineMacro("\\DOTSI", "\\relax");
    defineMacro("\\DOTSB", "\\relax");
    defineMacro("\\DOTSX", "\\relax");
    defineMacro("\\tmspace", "\\TextOrMath{\\kern#1#3}{\\mskip#1#2}\\relax");
    defineMacro("\\,", "\\tmspace+{3mu}{.1667em}");
    defineMacro("\\thinspace", "\\,");
    defineMacro("\\>", "\\mskip{4mu}");
    defineMacro("\\:", "\\tmspace+{4mu}{.2222em}");
    defineMacro("\\medspace", "\\:");
    defineMacro("\\;", "\\tmspace+{5mu}{.2777em}");
    defineMacro("\\thickspace", "\\;");
    defineMacro("\\!", "\\tmspace-{3mu}{.1667em}");
    defineMacro("\\negthinspace", "\\!");
    defineMacro("\\negmedspace", "\\tmspace-{4mu}{.2222em}");
    defineMacro("\\negthickspace", "\\tmspace-{5mu}{.277em}");
    defineMacro("\\enspace", "\\kern.5em ");
    defineMacro("\\enskip", "\\hskip.5em\\relax");
    defineMacro("\\quad", "\\hskip1em\\relax");
    defineMacro("\\qquad", "\\hskip2em\\relax");
    defineMacro("\\tag", "\\@ifstar\\tag@literal\\tag@paren");
    defineMacro("\\tag@paren", "\\tag@literal{({#1})}");
    defineMacro("\\tag@literal", (context) => {
      if (context.macros.get("\\df@tag")) {
        throw new ParseError("Multiple \\tag");
      }
      return "\\gdef\\df@tag{\\text{#1}}";
    });
    defineMacro("\\bmod", "\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}\\mathbin{\\rm mod}\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}");
    defineMacro("\\pod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)");
    defineMacro("\\pmod", "\\pod{{\\rm mod}\\mkern6mu#1}");
    defineMacro("\\mod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}{\\rm mod}\\,\\,#1");
    defineMacro("\\newline", "\\\\\\relax");
    defineMacro("\\TeX", "\\textrm{\\html@mathml{T\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125emX}{TeX}}");
    var latexRaiseA = makeEm(fontMetricsData["Main-Regular"]["T".charCodeAt(0)][1] - 0.7 * fontMetricsData["Main-Regular"]["A".charCodeAt(0)][1]);
    defineMacro("\\LaTeX", "\\textrm{\\html@mathml{" + ("L\\kern-.36em\\raisebox{" + latexRaiseA + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{LaTeX}}");
    defineMacro("\\KaTeX", "\\textrm{\\html@mathml{" + ("K\\kern-.17em\\raisebox{" + latexRaiseA + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{KaTeX}}");
    defineMacro("\\hspace", "\\@ifstar\\@hspacer\\@hspace");
    defineMacro("\\@hspace", "\\hskip #1\\relax");
    defineMacro("\\@hspacer", "\\rule{0pt}{0pt}\\hskip #1\\relax");
    defineMacro("\\ordinarycolon", ":");
    defineMacro("\\vcentcolon", "\\mathrel{\\mathop\\ordinarycolon}");
    defineMacro("\\dblcolon", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-.9mu}\\vcentcolon}}{\\mathop{\\char"2237}}');
    defineMacro("\\coloneqq", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char"2254}}');
    defineMacro("\\Coloneqq", '\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char"2237\\char"3d}}');
    defineMacro("\\coloneq", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char"3a\\char"2212}}');
    defineMacro("\\Coloneq", '\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char"2237\\char"2212}}');
    defineMacro("\\eqqcolon", '\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char"2255}}');
    defineMacro("\\Eqqcolon", '\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char"3d\\char"2237}}');
    defineMacro("\\eqcolon", '\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char"2239}}');
    defineMacro("\\Eqcolon", '\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char"2212\\char"2237}}');
    defineMacro("\\colonapprox", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char"3a\\char"2248}}');
    defineMacro("\\Colonapprox", '\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char"2237\\char"2248}}');
    defineMacro("\\colonsim", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char"3a\\char"223c}}');
    defineMacro("\\Colonsim", '\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char"2237\\char"223c}}');
    defineMacro("\u2237", "\\dblcolon");
    defineMacro("\u2239", "\\eqcolon");
    defineMacro("\u2254", "\\coloneqq");
    defineMacro("\u2255", "\\eqqcolon");
    defineMacro("\u2A74", "\\Coloneqq");
    defineMacro("\\ratio", "\\vcentcolon");
    defineMacro("\\coloncolon", "\\dblcolon");
    defineMacro("\\colonequals", "\\coloneqq");
    defineMacro("\\coloncolonequals", "\\Coloneqq");
    defineMacro("\\equalscolon", "\\eqqcolon");
    defineMacro("\\equalscoloncolon", "\\Eqqcolon");
    defineMacro("\\colonminus", "\\coloneq");
    defineMacro("\\coloncolonminus", "\\Coloneq");
    defineMacro("\\minuscolon", "\\eqcolon");
    defineMacro("\\minuscoloncolon", "\\Eqcolon");
    defineMacro("\\coloncolonapprox", "\\Colonapprox");
    defineMacro("\\coloncolonsim", "\\Colonsim");
    defineMacro("\\simcolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\vcentcolon}");
    defineMacro("\\simcoloncolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\dblcolon}");
    defineMacro("\\approxcolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\vcentcolon}");
    defineMacro("\\approxcoloncolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\dblcolon}");
    defineMacro("\\notni", "\\html@mathml{\\not\\ni}{\\mathrel{\\char`\u220C}}");
    defineMacro("\\limsup", "\\DOTSB\\operatorname*{lim\\,sup}");
    defineMacro("\\liminf", "\\DOTSB\\operatorname*{lim\\,inf}");
    defineMacro("\\injlim", "\\DOTSB\\operatorname*{inj\\,lim}");
    defineMacro("\\projlim", "\\DOTSB\\operatorname*{proj\\,lim}");
    defineMacro("\\varlimsup", "\\DOTSB\\operatorname*{\\overline{lim}}");
    defineMacro("\\varliminf", "\\DOTSB\\operatorname*{\\underline{lim}}");
    defineMacro("\\varinjlim", "\\DOTSB\\operatorname*{\\underrightarrow{lim}}");
    defineMacro("\\varprojlim", "\\DOTSB\\operatorname*{\\underleftarrow{lim}}");
    defineMacro("\\gvertneqq", "\\html@mathml{\\@gvertneqq}{\u2269}");
    defineMacro("\\lvertneqq", "\\html@mathml{\\@lvertneqq}{\u2268}");
    defineMacro("\\ngeqq", "\\html@mathml{\\@ngeqq}{\u2271}");
    defineMacro("\\ngeqslant", "\\html@mathml{\\@ngeqslant}{\u2271}");
    defineMacro("\\nleqq", "\\html@mathml{\\@nleqq}{\u2270}");
    defineMacro("\\nleqslant", "\\html@mathml{\\@nleqslant}{\u2270}");
    defineMacro("\\nshortmid", "\\html@mathml{\\@nshortmid}{\u2224}");
    defineMacro("\\nshortparallel", "\\html@mathml{\\@nshortparallel}{\u2226}");
    defineMacro("\\nsubseteqq", "\\html@mathml{\\@nsubseteqq}{\u2288}");
    defineMacro("\\nsupseteqq", "\\html@mathml{\\@nsupseteqq}{\u2289}");
    defineMacro("\\varsubsetneq", "\\html@mathml{\\@varsubsetneq}{\u228A}");
    defineMacro("\\varsubsetneqq", "\\html@mathml{\\@varsubsetneqq}{\u2ACB}");
    defineMacro("\\varsupsetneq", "\\html@mathml{\\@varsupsetneq}{\u228B}");
    defineMacro("\\varsupsetneqq", "\\html@mathml{\\@varsupsetneqq}{\u2ACC}");
    defineMacro("\\imath", "\\html@mathml{\\@imath}{\u0131}");
    defineMacro("\\jmath", "\\html@mathml{\\@jmath}{\u0237}");
    defineMacro("\\llbracket", "\\html@mathml{\\mathopen{[\\mkern-3.2mu[}}{\\mathopen{\\char`\u27E6}}");
    defineMacro("\\rrbracket", "\\html@mathml{\\mathclose{]\\mkern-3.2mu]}}{\\mathclose{\\char`\u27E7}}");
    defineMacro("\u27E6", "\\llbracket");
    defineMacro("\u27E7", "\\rrbracket");
    defineMacro("\\lBrace", "\\html@mathml{\\mathopen{\\{\\mkern-3.2mu[}}{\\mathopen{\\char`\u2983}}");
    defineMacro("\\rBrace", "\\html@mathml{\\mathclose{]\\mkern-3.2mu\\}}}{\\mathclose{\\char`\u2984}}");
    defineMacro("\u2983", "\\lBrace");
    defineMacro("\u2984", "\\rBrace");
    defineMacro("\\minuso", "\\mathbin{\\html@mathml{{\\mathrlap{\\mathchoice{\\kern{0.145em}}{\\kern{0.145em}}{\\kern{0.1015em}}{\\kern{0.0725em}}\\circ}{-}}}{\\char`\u29B5}}");
    defineMacro("\u29B5", "\\minuso");
    defineMacro("\\darr", "\\downarrow");
    defineMacro("\\dArr", "\\Downarrow");
    defineMacro("\\Darr", "\\Downarrow");
    defineMacro("\\lang", "\\langle");
    defineMacro("\\rang", "\\rangle");
    defineMacro("\\uarr", "\\uparrow");
    defineMacro("\\uArr", "\\Uparrow");
    defineMacro("\\Uarr", "\\Uparrow");
    defineMacro("\\N", "\\mathbb{N}");
    defineMacro("\\R", "\\mathbb{R}");
    defineMacro("\\Z", "\\mathbb{Z}");
    defineMacro("\\alef", "\\aleph");
    defineMacro("\\alefsym", "\\aleph");
    defineMacro("\\Alpha", "\\mathrm{A}");
    defineMacro("\\Beta", "\\mathrm{B}");
    defineMacro("\\bull", "\\bullet");
    defineMacro("\\Chi", "\\mathrm{X}");
    defineMacro("\\clubs", "\\clubsuit");
    defineMacro("\\cnums", "\\mathbb{C}");
    defineMacro("\\Complex", "\\mathbb{C}");
    defineMacro("\\Dagger", "\\ddagger");
    defineMacro("\\diamonds", "\\diamondsuit");
    defineMacro("\\empty", "\\emptyset");
    defineMacro("\\Epsilon", "\\mathrm{E}");
    defineMacro("\\Eta", "\\mathrm{H}");
    defineMacro("\\exist", "\\exists");
    defineMacro("\\harr", "\\leftrightarrow");
    defineMacro("\\hArr", "\\Leftrightarrow");
    defineMacro("\\Harr", "\\Leftrightarrow");
    defineMacro("\\hearts", "\\heartsuit");
    defineMacro("\\image", "\\Im");
    defineMacro("\\infin", "\\infty");
    defineMacro("\\Iota", "\\mathrm{I}");
    defineMacro("\\isin", "\\in");
    defineMacro("\\Kappa", "\\mathrm{K}");
    defineMacro("\\larr", "\\leftarrow");
    defineMacro("\\lArr", "\\Leftarrow");
    defineMacro("\\Larr", "\\Leftarrow");
    defineMacro("\\lrarr", "\\leftrightarrow");
    defineMacro("\\lrArr", "\\Leftrightarrow");
    defineMacro("\\Lrarr", "\\Leftrightarrow");
    defineMacro("\\Mu", "\\mathrm{M}");
    defineMacro("\\natnums", "\\mathbb{N}");
    defineMacro("\\Nu", "\\mathrm{N}");
    defineMacro("\\Omicron", "\\mathrm{O}");
    defineMacro("\\plusmn", "\\pm");
    defineMacro("\\rarr", "\\rightarrow");
    defineMacro("\\rArr", "\\Rightarrow");
    defineMacro("\\Rarr", "\\Rightarrow");
    defineMacro("\\real", "\\Re");
    defineMacro("\\reals", "\\mathbb{R}");
    defineMacro("\\Reals", "\\mathbb{R}");
    defineMacro("\\Rho", "\\mathrm{P}");
    defineMacro("\\sdot", "\\cdot");
    defineMacro("\\sect", "\\S");
    defineMacro("\\spades", "\\spadesuit");
    defineMacro("\\sub", "\\subset");
    defineMacro("\\sube", "\\subseteq");
    defineMacro("\\supe", "\\supseteq");
    defineMacro("\\Tau", "\\mathrm{T}");
    defineMacro("\\thetasym", "\\vartheta");
    defineMacro("\\weierp", "\\wp");
    defineMacro("\\Zeta", "\\mathrm{Z}");
    defineMacro("\\argmin", "\\DOTSB\\operatorname*{arg\\,min}");
    defineMacro("\\argmax", "\\DOTSB\\operatorname*{arg\\,max}");
    defineMacro("\\plim", "\\DOTSB\\mathop{\\operatorname{plim}}\\limits");
    defineMacro("\\bra", "\\mathinner{\\langle{#1}|}");
    defineMacro("\\ket", "\\mathinner{|{#1}\\rangle}");
    defineMacro("\\braket", "\\mathinner{\\langle{#1}\\rangle}");
    defineMacro("\\Bra", "\\left\\langle#1\\right|");
    defineMacro("\\Ket", "\\left|#1\\right\\rangle");
    var braketHelper = (one) => (context) => {
      var left = context.consumeArg().tokens;
      var middle = context.consumeArg().tokens;
      var middleDouble = context.consumeArg().tokens;
      var right = context.consumeArg().tokens;
      var oldMiddle = context.macros.get("|");
      var oldMiddleDouble = context.macros.get("\\|");
      context.macros.beginGroup();
      var midMacro = (double) => (context2) => {
        if (one) {
          context2.macros.set("|", oldMiddle);
          if (middleDouble.length) {
            context2.macros.set("\\|", oldMiddleDouble);
          }
        }
        var doubled = double;
        if (!double && middleDouble.length) {
          var nextToken = context2.future();
          if (nextToken.text === "|") {
            context2.popToken();
            doubled = true;
          }
        }
        return {
          tokens: doubled ? middleDouble : middle,
          numArgs: 0
        };
      };
      context.macros.set("|", midMacro(false));
      if (middleDouble.length) {
        context.macros.set("\\|", midMacro(true));
      }
      var arg = context.consumeArg().tokens;
      var expanded = context.expandTokens([
        ...right,
        ...arg,
        ...left
        // reversed
      ]);
      context.macros.endGroup();
      return {
        tokens: expanded.reverse(),
        numArgs: 0
      };
    };
    defineMacro("\\bra@ket", braketHelper(false));
    defineMacro("\\bra@set", braketHelper(true));
    defineMacro("\\Braket", "\\bra@ket{\\left\\langle}{\\,\\middle\\vert\\,}{\\,\\middle\\vert\\,}{\\right\\rangle}");
    defineMacro("\\Set", "\\bra@set{\\left\\{\\:}{\\;\\middle\\vert\\;}{\\;\\middle\\Vert\\;}{\\:\\right\\}}");
    defineMacro("\\set", "\\bra@set{\\{\\,}{\\mid}{}{\\,\\}}");
    defineMacro("\\angln", "{\\angl n}");
    defineMacro("\\blue", "\\textcolor{##6495ed}{#1}");
    defineMacro("\\orange", "\\textcolor{##ffa500}{#1}");
    defineMacro("\\pink", "\\textcolor{##ff00af}{#1}");
    defineMacro("\\red", "\\textcolor{##df0030}{#1}");
    defineMacro("\\green", "\\textcolor{##28ae7b}{#1}");
    defineMacro("\\gray", "\\textcolor{gray}{#1}");
    defineMacro("\\purple", "\\textcolor{##9d38bd}{#1}");
    defineMacro("\\blueA", "\\textcolor{##ccfaff}{#1}");
    defineMacro("\\blueB", "\\textcolor{##80f6ff}{#1}");
    defineMacro("\\blueC", "\\textcolor{##63d9ea}{#1}");
    defineMacro("\\blueD", "\\textcolor{##11accd}{#1}");
    defineMacro("\\blueE", "\\textcolor{##0c7f99}{#1}");
    defineMacro("\\tealA", "\\textcolor{##94fff5}{#1}");
    defineMacro("\\tealB", "\\textcolor{##26edd5}{#1}");
    defineMacro("\\tealC", "\\textcolor{##01d1c1}{#1}");
    defineMacro("\\tealD", "\\textcolor{##01a995}{#1}");
    defineMacro("\\tealE", "\\textcolor{##208170}{#1}");
    defineMacro("\\greenA", "\\textcolor{##b6ffb0}{#1}");
    defineMacro("\\greenB", "\\textcolor{##8af281}{#1}");
    defineMacro("\\greenC", "\\textcolor{##74cf70}{#1}");
    defineMacro("\\greenD", "\\textcolor{##1fab54}{#1}");
    defineMacro("\\greenE", "\\textcolor{##0d923f}{#1}");
    defineMacro("\\goldA", "\\textcolor{##ffd0a9}{#1}");
    defineMacro("\\goldB", "\\textcolor{##ffbb71}{#1}");
    defineMacro("\\goldC", "\\textcolor{##ff9c39}{#1}");
    defineMacro("\\goldD", "\\textcolor{##e07d10}{#1}");
    defineMacro("\\goldE", "\\textcolor{##a75a05}{#1}");
    defineMacro("\\redA", "\\textcolor{##fca9a9}{#1}");
    defineMacro("\\redB", "\\textcolor{##ff8482}{#1}");
    defineMacro("\\redC", "\\textcolor{##f9685d}{#1}");
    defineMacro("\\redD", "\\textcolor{##e84d39}{#1}");
    defineMacro("\\redE", "\\textcolor{##bc2612}{#1}");
    defineMacro("\\maroonA", "\\textcolor{##ffbde0}{#1}");
    defineMacro("\\maroonB", "\\textcolor{##ff92c6}{#1}");
    defineMacro("\\maroonC", "\\textcolor{##ed5fa6}{#1}");
    defineMacro("\\maroonD", "\\textcolor{##ca337c}{#1}");
    defineMacro("\\maroonE", "\\textcolor{##9e034e}{#1}");
    defineMacro("\\purpleA", "\\textcolor{##ddd7ff}{#1}");
    defineMacro("\\purpleB", "\\textcolor{##c6b9fc}{#1}");
    defineMacro("\\purpleC", "\\textcolor{##aa87ff}{#1}");
    defineMacro("\\purpleD", "\\textcolor{##7854ab}{#1}");
    defineMacro("\\purpleE", "\\textcolor{##543b78}{#1}");
    defineMacro("\\mintA", "\\textcolor{##f5f9e8}{#1}");
    defineMacro("\\mintB", "\\textcolor{##edf2df}{#1}");
    defineMacro("\\mintC", "\\textcolor{##e0e5cc}{#1}");
    defineMacro("\\grayA", "\\textcolor{##f6f7f7}{#1}");
    defineMacro("\\grayB", "\\textcolor{##f0f1f2}{#1}");
    defineMacro("\\grayC", "\\textcolor{##e3e5e6}{#1}");
    defineMacro("\\grayD", "\\textcolor{##d6d8da}{#1}");
    defineMacro("\\grayE", "\\textcolor{##babec2}{#1}");
    defineMacro("\\grayF", "\\textcolor{##888d93}{#1}");
    defineMacro("\\grayG", "\\textcolor{##626569}{#1}");
    defineMacro("\\grayH", "\\textcolor{##3b3e40}{#1}");
    defineMacro("\\grayI", "\\textcolor{##21242c}{#1}");
    defineMacro("\\kaBlue", "\\textcolor{##314453}{#1}");
    defineMacro("\\kaGreen", "\\textcolor{##71B307}{#1}");
    var implicitCommands = {
      "^": true,
      // Parser.js
      "_": true,
      // Parser.js
      "\\limits": true,
      // Parser.js
      "\\nolimits": true
      // Parser.js
    };
    var MacroExpander = class {
      constructor(input, settings, mode) {
        this.settings = void 0;
        this.expansionCount = void 0;
        this.lexer = void 0;
        this.macros = void 0;
        this.stack = void 0;
        this.mode = void 0;
        this.settings = settings;
        this.expansionCount = 0;
        this.feed(input);
        this.macros = new Namespace(macros, settings.macros);
        this.mode = mode;
        this.stack = [];
      }
      /**
       * Feed a new input string to the same MacroExpander
       * (with existing macros etc.).
       */
      feed(input) {
        this.lexer = new Lexer(input, this.settings);
      }
      /**
       * Switches between "text" and "math" modes.
       */
      switchMode(newMode) {
        this.mode = newMode;
      }
      /**
       * Start a new group nesting within all namespaces.
       */
      beginGroup() {
        this.macros.beginGroup();
      }
      /**
       * End current group nesting within all namespaces.
       */
      endGroup() {
        this.macros.endGroup();
      }
      /**
       * Ends all currently nested groups (if any), restoring values before the
       * groups began.  Useful in case of an error in the middle of parsing.
       */
      endGroups() {
        this.macros.endGroups();
      }
      /**
       * Returns the topmost token on the stack, without expanding it.
       * Similar in behavior to TeX's `\futurelet`.
       */
      future() {
        if (this.stack.length === 0) {
          this.pushToken(this.lexer.lex());
        }
        return this.stack[this.stack.length - 1];
      }
      /**
       * Remove and return the next unexpanded token.
       */
      popToken() {
        this.future();
        return this.stack.pop();
      }
      /**
       * Add a given token to the token stack.  In particular, this get be used
       * to put back a token returned from one of the other methods.
       */
      pushToken(token) {
        this.stack.push(token);
      }
      /**
       * Append an array of tokens to the token stack.
       */
      pushTokens(tokens) {
        this.stack.push(...tokens);
      }
      /**
       * Find an macro argument without expanding tokens and append the array of
       * tokens to the token stack. Uses Token as a container for the result.
       */
      scanArgument(isOptional) {
        var start;
        var end;
        var tokens;
        if (isOptional) {
          this.consumeSpaces();
          if (this.future().text !== "[") {
            return null;
          }
          start = this.popToken();
          ({
            tokens,
            end
          } = this.consumeArg(["]"]));
        } else {
          ({
            tokens,
            start,
            end
          } = this.consumeArg());
        }
        this.pushToken(new Token("EOF", end.loc));
        this.pushTokens(tokens);
        return new Token("", SourceLocation.range(start, end));
      }
      /**
       * Consume all following space tokens, without expansion.
       */
      consumeSpaces() {
        for (; ; ) {
          var token = this.future();
          if (token.text === " ") {
            this.stack.pop();
          } else {
            break;
          }
        }
      }
      /**
       * Consume an argument from the token stream, and return the resulting array
       * of tokens and start/end token.
       */
      consumeArg(delims) {
        var tokens = [];
        var isDelimited = delims && delims.length > 0;
        if (!isDelimited) {
          this.consumeSpaces();
        }
        var start = this.future();
        var tok;
        var depth = 0;
        var match = 0;
        do {
          tok = this.popToken();
          tokens.push(tok);
          if (tok.text === "{") {
            ++depth;
          } else if (tok.text === "}") {
            --depth;
            if (depth === -1) {
              throw new ParseError("Extra }", tok);
            }
          } else if (tok.text === "EOF") {
            throw new ParseError("Unexpected end of input in a macro argument, expected '" + (delims && isDelimited ? delims[match] : "}") + "'", tok);
          }
          if (delims && isDelimited) {
            if ((depth === 0 || depth === 1 && delims[match] === "{") && tok.text === delims[match]) {
              ++match;
              if (match === delims.length) {
                tokens.splice(-match, match);
                break;
              }
            } else {
              match = 0;
            }
          }
        } while (depth !== 0 || isDelimited);
        if (start.text === "{" && tokens[tokens.length - 1].text === "}") {
          tokens.pop();
          tokens.shift();
        }
        tokens.reverse();
        return {
          tokens,
          start,
          end: tok
        };
      }
      /**
       * Consume the specified number of (delimited) arguments from the token
       * stream and return the resulting array of arguments.
       */
      consumeArgs(numArgs, delimiters2) {
        if (delimiters2) {
          if (delimiters2.length !== numArgs + 1) {
            throw new ParseError("The length of delimiters doesn't match the number of args!");
          }
          var delims = delimiters2[0];
          for (var i = 0; i < delims.length; i++) {
            var tok = this.popToken();
            if (delims[i] !== tok.text) {
              throw new ParseError("Use of the macro doesn't match its definition", tok);
            }
          }
        }
        var args = [];
        for (var _i = 0; _i < numArgs; _i++) {
          args.push(this.consumeArg(delimiters2 && delimiters2[_i + 1]).tokens);
        }
        return args;
      }
      /**
       * Increment `expansionCount` by the specified amount.
       * Throw an error if it exceeds `maxExpand`.
       */
      countExpansion(amount) {
        this.expansionCount += amount;
        if (this.expansionCount > this.settings.maxExpand) {
          throw new ParseError("Too many expansions: infinite loop or need to increase maxExpand setting");
        }
      }
      /**
       * Expand the next token only once if possible.
       *
       * If the token is expanded, the resulting tokens will be pushed onto
       * the stack in reverse order, and the number of such tokens will be
       * returned.  This number might be zero or positive.
       *
       * If not, the return value is `false`, and the next token remains at the
       * top of the stack.
       *
       * In either case, the next token will be on the top of the stack,
       * or the stack will be empty (in case of empty expansion
       * and no other tokens).
       *
       * Used to implement `expandAfterFuture` and `expandNextToken`.
       *
       * If expandableOnly, only expandable tokens are expanded and
       * an undefined control sequence results in an error.
       */
      expandOnce(expandableOnly) {
        var topToken = this.popToken();
        var name2 = topToken.text;
        var expansion = !topToken.noexpand ? this._getExpansion(name2) : null;
        if (expansion == null || expandableOnly && expansion.unexpandable) {
          if (expandableOnly && expansion == null && name2[0] === "\\" && !this.isDefined(name2)) {
            throw new ParseError("Undefined control sequence: " + name2);
          }
          this.pushToken(topToken);
          return false;
        }
        this.countExpansion(1);
        var tokens = expansion.tokens;
        var args = this.consumeArgs(expansion.numArgs, expansion.delimiters);
        if (expansion.numArgs) {
          tokens = tokens.slice();
          for (var i = tokens.length - 1; i >= 0; --i) {
            var tok = tokens[i];
            if (tok.text === "#") {
              if (i === 0) {
                throw new ParseError("Incomplete placeholder at end of macro body", tok);
              }
              tok = tokens[--i];
              if (tok.text === "#") {
                tokens.splice(i + 1, 1);
              } else if (/^[1-9]$/.test(tok.text)) {
                tokens.splice(i, 2, ...args[+tok.text - 1]);
              } else {
                throw new ParseError("Not a valid argument number", tok);
              }
            }
          }
        }
        this.pushTokens(tokens);
        return tokens.length;
      }
      /**
       * Expand the next token only once (if possible), and return the resulting
       * top token on the stack (without removing anything from the stack).
       * Similar in behavior to TeX's `\expandafter\futurelet`.
       * Equivalent to expandOnce() followed by future().
       */
      expandAfterFuture() {
        this.expandOnce();
        return this.future();
      }
      /**
       * Recursively expand first token, then return first non-expandable token.
       */
      expandNextToken() {
        for (; ; ) {
          if (this.expandOnce() === false) {
            var token = this.stack.pop();
            if (token.treatAsRelax) {
              token.text = "\\relax";
            }
            return token;
          }
        }
      }
      /**
       * Fully expand the given macro name and return the resulting list of
       * tokens, or return `undefined` if no such macro is defined.
       */
      expandMacro(name2) {
        return this.macros.has(name2) ? this.expandTokens([new Token(name2)]) : void 0;
      }
      /**
       * Fully expand the given token stream and return the resulting list of
       * tokens.  Note that the input tokens are in reverse order, but the
       * output tokens are in forward order.
       */
      expandTokens(tokens) {
        var output = [];
        var oldStackLength = this.stack.length;
        this.pushTokens(tokens);
        while (this.stack.length > oldStackLength) {
          if (this.expandOnce(true) === false) {
            var token = this.stack.pop();
            if (token.treatAsRelax) {
              token.noexpand = false;
              token.treatAsRelax = false;
            }
            output.push(token);
          }
        }
        this.countExpansion(output.length);
        return output;
      }
      /**
       * Fully expand the given macro name and return the result as a string,
       * or return `undefined` if no such macro is defined.
       */
      expandMacroAsText(name2) {
        var tokens = this.expandMacro(name2);
        if (tokens) {
          return tokens.map((token) => token.text).join("");
        } else {
          return tokens;
        }
      }
      /**
       * Returns the expanded macro as a reversed array of tokens and a macro
       * argument count.  Or returns `null` if no such macro.
       */
      _getExpansion(name2) {
        var definition = this.macros.get(name2);
        if (definition == null) {
          return definition;
        }
        if (name2.length === 1) {
          var catcode = this.lexer.catcodes[name2];
          if (catcode != null && catcode !== 13) {
            return;
          }
        }
        var expansion = typeof definition === "function" ? definition(this) : definition;
        if (typeof expansion === "string") {
          var numArgs = 0;
          if (expansion.includes("#")) {
            var stripped = expansion.replace(/##/g, "");
            while (stripped.includes("#" + (numArgs + 1))) {
              ++numArgs;
            }
          }
          var bodyLexer = new Lexer(expansion, this.settings);
          var tokens = [];
          var tok = bodyLexer.lex();
          while (tok.text !== "EOF") {
            tokens.push(tok);
            tok = bodyLexer.lex();
          }
          tokens.reverse();
          var expanded = {
            tokens,
            numArgs
          };
          return expanded;
        }
        return expansion;
      }
      /**
       * Determine whether a command is currently "defined" (has some
       * functionality), meaning that it's a macro (in the current group),
       * a function, a symbol, or one of the special commands listed in
       * `implicitCommands`.
       */
      isDefined(name2) {
        return this.macros.has(name2) || functions.hasOwnProperty(name2) || symbols.math.hasOwnProperty(name2) || symbols.text.hasOwnProperty(name2) || implicitCommands.hasOwnProperty(name2);
      }
      /**
       * Determine whether a command is expandable.
       */
      isExpandable(name2) {
        var macro = this.macros.get(name2);
        return macro != null ? typeof macro === "string" || typeof macro === "function" || !macro.unexpandable : functions.hasOwnProperty(name2) && !functions[name2].primitive;
      }
    };
    var unicodeSubRegEx = /^[₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ]/;
    var uSubsAndSups = Object.freeze({
      "\u208A": "+",
      "\u208B": "-",
      "\u208C": "=",
      "\u208D": "(",
      "\u208E": ")",
      "\u2080": "0",
      "\u2081": "1",
      "\u2082": "2",
      "\u2083": "3",
      "\u2084": "4",
      "\u2085": "5",
      "\u2086": "6",
      "\u2087": "7",
      "\u2088": "8",
      "\u2089": "9",
      "\u2090": "a",
      "\u2091": "e",
      "\u2095": "h",
      "\u1D62": "i",
      "\u2C7C": "j",
      "\u2096": "k",
      "\u2097": "l",
      "\u2098": "m",
      "\u2099": "n",
      "\u2092": "o",
      "\u209A": "p",
      "\u1D63": "r",
      "\u209B": "s",
      "\u209C": "t",
      "\u1D64": "u",
      "\u1D65": "v",
      "\u2093": "x",
      "\u1D66": "\u03B2",
      "\u1D67": "\u03B3",
      "\u1D68": "\u03C1",
      "\u1D69": "\u03D5",
      "\u1D6A": "\u03C7",
      "\u207A": "+",
      "\u207B": "-",
      "\u207C": "=",
      "\u207D": "(",
      "\u207E": ")",
      "\u2070": "0",
      "\xB9": "1",
      "\xB2": "2",
      "\xB3": "3",
      "\u2074": "4",
      "\u2075": "5",
      "\u2076": "6",
      "\u2077": "7",
      "\u2078": "8",
      "\u2079": "9",
      "\u1D2C": "A",
      "\u1D2E": "B",
      "\u1D30": "D",
      "\u1D31": "E",
      "\u1D33": "G",
      "\u1D34": "H",
      "\u1D35": "I",
      "\u1D36": "J",
      "\u1D37": "K",
      "\u1D38": "L",
      "\u1D39": "M",
      "\u1D3A": "N",
      "\u1D3C": "O",
      "\u1D3E": "P",
      "\u1D3F": "R",
      "\u1D40": "T",
      "\u1D41": "U",
      "\u2C7D": "V",
      "\u1D42": "W",
      "\u1D43": "a",
      "\u1D47": "b",
      "\u1D9C": "c",
      "\u1D48": "d",
      "\u1D49": "e",
      "\u1DA0": "f",
      "\u1D4D": "g",
      "\u02B0": "h",
      "\u2071": "i",
      "\u02B2": "j",
      "\u1D4F": "k",
      "\u02E1": "l",
      "\u1D50": "m",
      "\u207F": "n",
      "\u1D52": "o",
      "\u1D56": "p",
      "\u02B3": "r",
      "\u02E2": "s",
      "\u1D57": "t",
      "\u1D58": "u",
      "\u1D5B": "v",
      "\u02B7": "w",
      "\u02E3": "x",
      "\u02B8": "y",
      "\u1DBB": "z",
      "\u1D5D": "\u03B2",
      "\u1D5E": "\u03B3",
      "\u1D5F": "\u03B4",
      "\u1D60": "\u03D5",
      "\u1D61": "\u03C7",
      "\u1DBF": "\u03B8"
    });
    var unicodeAccents = {
      "\u0301": {
        "text": "\\'",
        "math": "\\acute"
      },
      "\u0300": {
        "text": "\\`",
        "math": "\\grave"
      },
      "\u0308": {
        "text": '\\"',
        "math": "\\ddot"
      },
      "\u0303": {
        "text": "\\~",
        "math": "\\tilde"
      },
      "\u0304": {
        "text": "\\=",
        "math": "\\bar"
      },
      "\u0306": {
        "text": "\\u",
        "math": "\\breve"
      },
      "\u030C": {
        "text": "\\v",
        "math": "\\check"
      },
      "\u0302": {
        "text": "\\^",
        "math": "\\hat"
      },
      "\u0307": {
        "text": "\\.",
        "math": "\\dot"
      },
      "\u030A": {
        "text": "\\r",
        "math": "\\mathring"
      },
      "\u030B": {
        "text": "\\H"
      },
      "\u0327": {
        "text": "\\c"
      }
    };
    var unicodeSymbols = {
      "\xE1": "a\u0301",
      "\xE0": "a\u0300",
      "\xE4": "a\u0308",
      "\u01DF": "a\u0308\u0304",
      "\xE3": "a\u0303",
      "\u0101": "a\u0304",
      "\u0103": "a\u0306",
      "\u1EAF": "a\u0306\u0301",
      "\u1EB1": "a\u0306\u0300",
      "\u1EB5": "a\u0306\u0303",
      "\u01CE": "a\u030C",
      "\xE2": "a\u0302",
      "\u1EA5": "a\u0302\u0301",
      "\u1EA7": "a\u0302\u0300",
      "\u1EAB": "a\u0302\u0303",
      "\u0227": "a\u0307",
      "\u01E1": "a\u0307\u0304",
      "\xE5": "a\u030A",
      "\u01FB": "a\u030A\u0301",
      "\u1E03": "b\u0307",
      "\u0107": "c\u0301",
      "\u1E09": "c\u0327\u0301",
      "\u010D": "c\u030C",
      "\u0109": "c\u0302",
      "\u010B": "c\u0307",
      "\xE7": "c\u0327",
      "\u010F": "d\u030C",
      "\u1E0B": "d\u0307",
      "\u1E11": "d\u0327",
      "\xE9": "e\u0301",
      "\xE8": "e\u0300",
      "\xEB": "e\u0308",
      "\u1EBD": "e\u0303",
      "\u0113": "e\u0304",
      "\u1E17": "e\u0304\u0301",
      "\u1E15": "e\u0304\u0300",
      "\u0115": "e\u0306",
      "\u1E1D": "e\u0327\u0306",
      "\u011B": "e\u030C",
      "\xEA": "e\u0302",
      "\u1EBF": "e\u0302\u0301",
      "\u1EC1": "e\u0302\u0300",
      "\u1EC5": "e\u0302\u0303",
      "\u0117": "e\u0307",
      "\u0229": "e\u0327",
      "\u1E1F": "f\u0307",
      "\u01F5": "g\u0301",
      "\u1E21": "g\u0304",
      "\u011F": "g\u0306",
      "\u01E7": "g\u030C",
      "\u011D": "g\u0302",
      "\u0121": "g\u0307",
      "\u0123": "g\u0327",
      "\u1E27": "h\u0308",
      "\u021F": "h\u030C",
      "\u0125": "h\u0302",
      "\u1E23": "h\u0307",
      "\u1E29": "h\u0327",
      "\xED": "i\u0301",
      "\xEC": "i\u0300",
      "\xEF": "i\u0308",
      "\u1E2F": "i\u0308\u0301",
      "\u0129": "i\u0303",
      "\u012B": "i\u0304",
      "\u012D": "i\u0306",
      "\u01D0": "i\u030C",
      "\xEE": "i\u0302",
      "\u01F0": "j\u030C",
      "\u0135": "j\u0302",
      "\u1E31": "k\u0301",
      "\u01E9": "k\u030C",
      "\u0137": "k\u0327",
      "\u013A": "l\u0301",
      "\u013E": "l\u030C",
      "\u013C": "l\u0327",
      "\u1E3F": "m\u0301",
      "\u1E41": "m\u0307",
      "\u0144": "n\u0301",
      "\u01F9": "n\u0300",
      "\xF1": "n\u0303",
      "\u0148": "n\u030C",
      "\u1E45": "n\u0307",
      "\u0146": "n\u0327",
      "\xF3": "o\u0301",
      "\xF2": "o\u0300",
      "\xF6": "o\u0308",
      "\u022B": "o\u0308\u0304",
      "\xF5": "o\u0303",
      "\u1E4D": "o\u0303\u0301",
      "\u1E4F": "o\u0303\u0308",
      "\u022D": "o\u0303\u0304",
      "\u014D": "o\u0304",
      "\u1E53": "o\u0304\u0301",
      "\u1E51": "o\u0304\u0300",
      "\u014F": "o\u0306",
      "\u01D2": "o\u030C",
      "\xF4": "o\u0302",
      "\u1ED1": "o\u0302\u0301",
      "\u1ED3": "o\u0302\u0300",
      "\u1ED7": "o\u0302\u0303",
      "\u022F": "o\u0307",
      "\u0231": "o\u0307\u0304",
      "\u0151": "o\u030B",
      "\u1E55": "p\u0301",
      "\u1E57": "p\u0307",
      "\u0155": "r\u0301",
      "\u0159": "r\u030C",
      "\u1E59": "r\u0307",
      "\u0157": "r\u0327",
      "\u015B": "s\u0301",
      "\u1E65": "s\u0301\u0307",
      "\u0161": "s\u030C",
      "\u1E67": "s\u030C\u0307",
      "\u015D": "s\u0302",
      "\u1E61": "s\u0307",
      "\u015F": "s\u0327",
      "\u1E97": "t\u0308",
      "\u0165": "t\u030C",
      "\u1E6B": "t\u0307",
      "\u0163": "t\u0327",
      "\xFA": "u\u0301",
      "\xF9": "u\u0300",
      "\xFC": "u\u0308",
      "\u01D8": "u\u0308\u0301",
      "\u01DC": "u\u0308\u0300",
      "\u01D6": "u\u0308\u0304",
      "\u01DA": "u\u0308\u030C",
      "\u0169": "u\u0303",
      "\u1E79": "u\u0303\u0301",
      "\u016B": "u\u0304",
      "\u1E7B": "u\u0304\u0308",
      "\u016D": "u\u0306",
      "\u01D4": "u\u030C",
      "\xFB": "u\u0302",
      "\u016F": "u\u030A",
      "\u0171": "u\u030B",
      "\u1E7D": "v\u0303",
      "\u1E83": "w\u0301",
      "\u1E81": "w\u0300",
      "\u1E85": "w\u0308",
      "\u0175": "w\u0302",
      "\u1E87": "w\u0307",
      "\u1E98": "w\u030A",
      "\u1E8D": "x\u0308",
      "\u1E8B": "x\u0307",
      "\xFD": "y\u0301",
      "\u1EF3": "y\u0300",
      "\xFF": "y\u0308",
      "\u1EF9": "y\u0303",
      "\u0233": "y\u0304",
      "\u0177": "y\u0302",
      "\u1E8F": "y\u0307",
      "\u1E99": "y\u030A",
      "\u017A": "z\u0301",
      "\u017E": "z\u030C",
      "\u1E91": "z\u0302",
      "\u017C": "z\u0307",
      "\xC1": "A\u0301",
      "\xC0": "A\u0300",
      "\xC4": "A\u0308",
      "\u01DE": "A\u0308\u0304",
      "\xC3": "A\u0303",
      "\u0100": "A\u0304",
      "\u0102": "A\u0306",
      "\u1EAE": "A\u0306\u0301",
      "\u1EB0": "A\u0306\u0300",
      "\u1EB4": "A\u0306\u0303",
      "\u01CD": "A\u030C",
      "\xC2": "A\u0302",
      "\u1EA4": "A\u0302\u0301",
      "\u1EA6": "A\u0302\u0300",
      "\u1EAA": "A\u0302\u0303",
      "\u0226": "A\u0307",
      "\u01E0": "A\u0307\u0304",
      "\xC5": "A\u030A",
      "\u01FA": "A\u030A\u0301",
      "\u1E02": "B\u0307",
      "\u0106": "C\u0301",
      "\u1E08": "C\u0327\u0301",
      "\u010C": "C\u030C",
      "\u0108": "C\u0302",
      "\u010A": "C\u0307",
      "\xC7": "C\u0327",
      "\u010E": "D\u030C",
      "\u1E0A": "D\u0307",
      "\u1E10": "D\u0327",
      "\xC9": "E\u0301",
      "\xC8": "E\u0300",
      "\xCB": "E\u0308",
      "\u1EBC": "E\u0303",
      "\u0112": "E\u0304",
      "\u1E16": "E\u0304\u0301",
      "\u1E14": "E\u0304\u0300",
      "\u0114": "E\u0306",
      "\u1E1C": "E\u0327\u0306",
      "\u011A": "E\u030C",
      "\xCA": "E\u0302",
      "\u1EBE": "E\u0302\u0301",
      "\u1EC0": "E\u0302\u0300",
      "\u1EC4": "E\u0302\u0303",
      "\u0116": "E\u0307",
      "\u0228": "E\u0327",
      "\u1E1E": "F\u0307",
      "\u01F4": "G\u0301",
      "\u1E20": "G\u0304",
      "\u011E": "G\u0306",
      "\u01E6": "G\u030C",
      "\u011C": "G\u0302",
      "\u0120": "G\u0307",
      "\u0122": "G\u0327",
      "\u1E26": "H\u0308",
      "\u021E": "H\u030C",
      "\u0124": "H\u0302",
      "\u1E22": "H\u0307",
      "\u1E28": "H\u0327",
      "\xCD": "I\u0301",
      "\xCC": "I\u0300",
      "\xCF": "I\u0308",
      "\u1E2E": "I\u0308\u0301",
      "\u0128": "I\u0303",
      "\u012A": "I\u0304",
      "\u012C": "I\u0306",
      "\u01CF": "I\u030C",
      "\xCE": "I\u0302",
      "\u0130": "I\u0307",
      "\u0134": "J\u0302",
      "\u1E30": "K\u0301",
      "\u01E8": "K\u030C",
      "\u0136": "K\u0327",
      "\u0139": "L\u0301",
      "\u013D": "L\u030C",
      "\u013B": "L\u0327",
      "\u1E3E": "M\u0301",
      "\u1E40": "M\u0307",
      "\u0143": "N\u0301",
      "\u01F8": "N\u0300",
      "\xD1": "N\u0303",
      "\u0147": "N\u030C",
      "\u1E44": "N\u0307",
      "\u0145": "N\u0327",
      "\xD3": "O\u0301",
      "\xD2": "O\u0300",
      "\xD6": "O\u0308",
      "\u022A": "O\u0308\u0304",
      "\xD5": "O\u0303",
      "\u1E4C": "O\u0303\u0301",
      "\u1E4E": "O\u0303\u0308",
      "\u022C": "O\u0303\u0304",
      "\u014C": "O\u0304",
      "\u1E52": "O\u0304\u0301",
      "\u1E50": "O\u0304\u0300",
      "\u014E": "O\u0306",
      "\u01D1": "O\u030C",
      "\xD4": "O\u0302",
      "\u1ED0": "O\u0302\u0301",
      "\u1ED2": "O\u0302\u0300",
      "\u1ED6": "O\u0302\u0303",
      "\u022E": "O\u0307",
      "\u0230": "O\u0307\u0304",
      "\u0150": "O\u030B",
      "\u1E54": "P\u0301",
      "\u1E56": "P\u0307",
      "\u0154": "R\u0301",
      "\u0158": "R\u030C",
      "\u1E58": "R\u0307",
      "\u0156": "R\u0327",
      "\u015A": "S\u0301",
      "\u1E64": "S\u0301\u0307",
      "\u0160": "S\u030C",
      "\u1E66": "S\u030C\u0307",
      "\u015C": "S\u0302",
      "\u1E60": "S\u0307",
      "\u015E": "S\u0327",
      "\u0164": "T\u030C",
      "\u1E6A": "T\u0307",
      "\u0162": "T\u0327",
      "\xDA": "U\u0301",
      "\xD9": "U\u0300",
      "\xDC": "U\u0308",
      "\u01D7": "U\u0308\u0301",
      "\u01DB": "U\u0308\u0300",
      "\u01D5": "U\u0308\u0304",
      "\u01D9": "U\u0308\u030C",
      "\u0168": "U\u0303",
      "\u1E78": "U\u0303\u0301",
      "\u016A": "U\u0304",
      "\u1E7A": "U\u0304\u0308",
      "\u016C": "U\u0306",
      "\u01D3": "U\u030C",
      "\xDB": "U\u0302",
      "\u016E": "U\u030A",
      "\u0170": "U\u030B",
      "\u1E7C": "V\u0303",
      "\u1E82": "W\u0301",
      "\u1E80": "W\u0300",
      "\u1E84": "W\u0308",
      "\u0174": "W\u0302",
      "\u1E86": "W\u0307",
      "\u1E8C": "X\u0308",
      "\u1E8A": "X\u0307",
      "\xDD": "Y\u0301",
      "\u1EF2": "Y\u0300",
      "\u0178": "Y\u0308",
      "\u1EF8": "Y\u0303",
      "\u0232": "Y\u0304",
      "\u0176": "Y\u0302",
      "\u1E8E": "Y\u0307",
      "\u0179": "Z\u0301",
      "\u017D": "Z\u030C",
      "\u1E90": "Z\u0302",
      "\u017B": "Z\u0307",
      "\u03AC": "\u03B1\u0301",
      "\u1F70": "\u03B1\u0300",
      "\u1FB1": "\u03B1\u0304",
      "\u1FB0": "\u03B1\u0306",
      "\u03AD": "\u03B5\u0301",
      "\u1F72": "\u03B5\u0300",
      "\u03AE": "\u03B7\u0301",
      "\u1F74": "\u03B7\u0300",
      "\u03AF": "\u03B9\u0301",
      "\u1F76": "\u03B9\u0300",
      "\u03CA": "\u03B9\u0308",
      "\u0390": "\u03B9\u0308\u0301",
      "\u1FD2": "\u03B9\u0308\u0300",
      "\u1FD1": "\u03B9\u0304",
      "\u1FD0": "\u03B9\u0306",
      "\u03CC": "\u03BF\u0301",
      "\u1F78": "\u03BF\u0300",
      "\u03CD": "\u03C5\u0301",
      "\u1F7A": "\u03C5\u0300",
      "\u03CB": "\u03C5\u0308",
      "\u03B0": "\u03C5\u0308\u0301",
      "\u1FE2": "\u03C5\u0308\u0300",
      "\u1FE1": "\u03C5\u0304",
      "\u1FE0": "\u03C5\u0306",
      "\u03CE": "\u03C9\u0301",
      "\u1F7C": "\u03C9\u0300",
      "\u038E": "\u03A5\u0301",
      "\u1FEA": "\u03A5\u0300",
      "\u03AB": "\u03A5\u0308",
      "\u1FE9": "\u03A5\u0304",
      "\u1FE8": "\u03A5\u0306",
      "\u038F": "\u03A9\u0301",
      "\u1FFA": "\u03A9\u0300"
    };
    var Parser = class _Parser {
      constructor(input, settings) {
        this.mode = void 0;
        this.gullet = void 0;
        this.settings = void 0;
        this.leftrightDepth = void 0;
        this.nextToken = void 0;
        this.mode = "math";
        this.gullet = new MacroExpander(input, settings, this.mode);
        this.settings = settings;
        this.leftrightDepth = 0;
        this.nextToken = null;
      }
      /**
       * Checks a result to make sure it has the right type, and throws an
       * appropriate error otherwise.
       */
      expect(text2, consume) {
        if (consume === void 0) {
          consume = true;
        }
        if (this.fetch().text !== text2) {
          throw new ParseError("Expected '" + text2 + "', got '" + this.fetch().text + "'", this.fetch());
        }
        if (consume) {
          this.consume();
        }
      }
      /**
       * Discards the current lookahead token, considering it consumed.
       */
      consume() {
        this.nextToken = null;
      }
      /**
       * Return the current lookahead token, or if there isn't one (at the
       * beginning, or if the previous lookahead token was consume()d),
       * fetch the next token as the new lookahead token and return it.
       */
      fetch() {
        if (this.nextToken == null) {
          this.nextToken = this.gullet.expandNextToken();
        }
        return this.nextToken;
      }
      /**
       * Switches between "text" and "math" modes.
       */
      switchMode(newMode) {
        this.mode = newMode;
        this.gullet.switchMode(newMode);
      }
      /**
       * Main parsing function, which parses an entire input.
       */
      parse() {
        if (!this.settings.globalGroup) {
          this.gullet.beginGroup();
        }
        if (this.settings.colorIsTextColor) {
          this.gullet.macros.set("\\color", "\\textcolor");
        }
        try {
          var parse = this.parseExpression(false);
          this.expect("EOF");
          if (!this.settings.globalGroup) {
            this.gullet.endGroup();
          }
          return parse;
        } finally {
          this.gullet.endGroups();
        }
      }
      /**
       * Fully parse a separate sequence of tokens as a separate job.
       * Tokens should be specified in reverse order, as in a MacroDefinition.
       */
      subparse(tokens) {
        var oldToken = this.nextToken;
        this.consume();
        this.gullet.pushToken(new Token("}"));
        this.gullet.pushTokens(tokens);
        var parse = this.parseExpression(false);
        this.expect("}");
        this.nextToken = oldToken;
        return parse;
      }
      /**
       * Parses an "expression", which is a list of atoms.
       *
       * `breakOnInfix`: Should the parsing stop when we hit infix nodes? This
       *                 happens when functions have higher precedence than infix
       *                 nodes in implicit parses.
       *
       * `breakOnTokenText`: The text of the token that the expression should end
       *                     with, or `null` if something else should end the
       *                     expression.
       */
      parseExpression(breakOnInfix, breakOnTokenText) {
        var body = [];
        while (true) {
          if (this.mode === "math") {
            this.consumeSpaces();
          }
          var lex = this.fetch();
          if (_Parser.endOfExpression.has(lex.text)) {
            break;
          }
          if (breakOnTokenText && lex.text === breakOnTokenText) {
            break;
          }
          if (breakOnInfix && functions[lex.text] && functions[lex.text].infix) {
            break;
          }
          var atom = this.parseAtom(breakOnTokenText);
          if (!atom) {
            break;
          } else if (atom.type === "internal") {
            continue;
          }
          body.push(atom);
        }
        if (this.mode === "text") {
          this.formLigatures(body);
        }
        return this.handleInfixNodes(body);
      }
      /**
       * Rewrites infix operators such as \over with corresponding commands such
       * as \frac.
       *
       * There can only be one infix operator per group.  If there's more than one
       * then the expression is ambiguous.  This can be resolved by adding {}.
       */
      handleInfixNodes(body) {
        var overIndex = -1;
        var funcName;
        for (var i = 0; i < body.length; i++) {
          var node = body[i];
          if (node.type === "infix") {
            if (overIndex !== -1) {
              throw new ParseError("only one infix operator per group", node.token);
            }
            overIndex = i;
            funcName = node.replaceWith;
          }
        }
        if (overIndex !== -1 && funcName) {
          var numerNode;
          var denomNode;
          var numerBody = body.slice(0, overIndex);
          var denomBody = body.slice(overIndex + 1);
          if (numerBody.length === 1 && numerBody[0].type === "ordgroup") {
            numerNode = numerBody[0];
          } else {
            numerNode = {
              type: "ordgroup",
              mode: this.mode,
              body: numerBody
            };
          }
          if (denomBody.length === 1 && denomBody[0].type === "ordgroup") {
            denomNode = denomBody[0];
          } else {
            denomNode = {
              type: "ordgroup",
              mode: this.mode,
              body: denomBody
            };
          }
          var _node;
          if (funcName === "\\\\abovefrac") {
            _node = this.callFunction(funcName, [numerNode, body[overIndex], denomNode], []);
          } else {
            _node = this.callFunction(funcName, [numerNode, denomNode], []);
          }
          return [_node];
        } else {
          return body;
        }
      }
      /**
       * Handle a subscript or superscript with nice errors.
       */
      handleSupSubscript(name2) {
        var symbolToken = this.fetch();
        var symbol = symbolToken.text;
        this.consume();
        this.consumeSpaces();
        var group;
        do {
          var _group;
          group = this.parseGroup(name2);
        } while (((_group = group) == null ? void 0 : _group.type) === "internal");
        if (!group) {
          throw new ParseError("Expected group after '" + symbol + "'", symbolToken);
        }
        return group;
      }
      /**
       * Converts the textual input of an unsupported command into a text node
       * contained within a color node whose color is determined by errorColor
       */
      formatUnsupportedCmd(text2) {
        var textordArray = [];
        for (var i = 0; i < text2.length; i++) {
          textordArray.push({
            type: "textord",
            mode: "text",
            text: text2[i]
          });
        }
        var textNode = {
          type: "text",
          mode: this.mode,
          body: textordArray
        };
        var colorNode = {
          type: "color",
          mode: this.mode,
          color: this.settings.errorColor,
          body: [textNode]
        };
        return colorNode;
      }
      /**
       * Parses a group with optional super/subscripts.
       */
      parseAtom(breakOnTokenText) {
        var base = this.parseGroup("atom", breakOnTokenText);
        if ((base == null ? void 0 : base.type) === "internal") {
          return base;
        }
        if (this.mode === "text") {
          return base;
        }
        var superscript;
        var subscript;
        while (true) {
          this.consumeSpaces();
          var lex = this.fetch();
          if (lex.text === "\\limits" || lex.text === "\\nolimits") {
            if (base && base.type === "op") {
              var limits = lex.text === "\\limits";
              base.limits = limits;
              base.alwaysHandleSupSub = true;
            } else if (base && base.type === "operatorname") {
              if (base.alwaysHandleSupSub) {
                base.limits = lex.text === "\\limits";
              }
            } else {
              throw new ParseError("Limit controls must follow a math operator", lex);
            }
            this.consume();
          } else if (lex.text === "^") {
            if (superscript) {
              throw new ParseError("Double superscript", lex);
            }
            superscript = this.handleSupSubscript("superscript");
          } else if (lex.text === "_") {
            if (subscript) {
              throw new ParseError("Double subscript", lex);
            }
            subscript = this.handleSupSubscript("subscript");
          } else if (lex.text === "'") {
            if (superscript) {
              throw new ParseError("Double superscript", lex);
            }
            var prime = {
              type: "textord",
              mode: this.mode,
              text: "\\prime"
            };
            var primes = [prime];
            this.consume();
            while (this.fetch().text === "'") {
              primes.push(prime);
              this.consume();
            }
            if (this.fetch().text === "^") {
              primes.push(this.handleSupSubscript("superscript"));
            }
            superscript = {
              type: "ordgroup",
              mode: this.mode,
              body: primes
            };
          } else if (uSubsAndSups[lex.text]) {
            var isSub = unicodeSubRegEx.test(lex.text);
            var subsupTokens = [];
            subsupTokens.push(new Token(uSubsAndSups[lex.text]));
            this.consume();
            while (true) {
              var token = this.fetch().text;
              if (!uSubsAndSups[token]) {
                break;
              }
              if (unicodeSubRegEx.test(token) !== isSub) {
                break;
              }
              subsupTokens.unshift(new Token(uSubsAndSups[token]));
              this.consume();
            }
            var body = this.subparse(subsupTokens);
            if (isSub) {
              subscript = {
                type: "ordgroup",
                mode: "math",
                body
              };
            } else {
              superscript = {
                type: "ordgroup",
                mode: "math",
                body
              };
            }
          } else {
            break;
          }
        }
        if (superscript || subscript) {
          return {
            type: "supsub",
            mode: this.mode,
            base,
            sup: superscript,
            sub: subscript
          };
        } else {
          return base;
        }
      }
      /**
       * Parses an entire function, including its base and all of its arguments.
       */
      parseFunction(breakOnTokenText, name2) {
        var token = this.fetch();
        var func = token.text;
        var funcData = functions[func];
        if (!funcData) {
          return null;
        }
        this.consume();
        if (name2 && name2 !== "atom" && !funcData.allowedInArgument) {
          throw new ParseError("Got function '" + func + "' with no arguments" + (name2 ? " as " + name2 : ""), token);
        } else if (this.mode === "text" && !funcData.allowedInText) {
          throw new ParseError("Can't use function '" + func + "' in text mode", token);
        } else if (this.mode === "math" && funcData.allowedInMath === false) {
          throw new ParseError("Can't use function '" + func + "' in math mode", token);
        }
        var {
          args,
          optArgs
        } = this.parseArguments(func, funcData);
        return this.callFunction(func, args, optArgs, token, breakOnTokenText);
      }
      /**
       * Call a function handler with a suitable context and arguments.
       */
      callFunction(name2, args, optArgs, token, breakOnTokenText) {
        var context = {
          funcName: name2,
          parser: this,
          token,
          breakOnTokenText
        };
        var func = functions[name2];
        if (func && func.handler) {
          return func.handler(context, args, optArgs);
        } else {
          throw new ParseError("No function handler for " + name2);
        }
      }
      /**
       * Parses the arguments of a function or environment
       */
      parseArguments(func, funcData) {
        var totalArgs = funcData.numArgs + funcData.numOptionalArgs;
        if (totalArgs === 0) {
          return {
            args: [],
            optArgs: []
          };
        }
        var args = [];
        var optArgs = [];
        for (var i = 0; i < totalArgs; i++) {
          var argType = funcData.argTypes && funcData.argTypes[i];
          var isOptional = i < funcData.numOptionalArgs;
          if ("primitive" in funcData && funcData.primitive && argType == null || // \sqrt expands into primitive if optional argument doesn't exist
          funcData.type === "sqrt" && i === 1 && optArgs[0] == null) {
            argType = "primitive";
          }
          var arg = this.parseGroupOfType("argument to '" + func + "'", argType, isOptional);
          if (isOptional) {
            optArgs.push(arg);
          } else if (arg != null) {
            args.push(arg);
          } else {
            throw new ParseError("Null argument, please report this as a bug");
          }
        }
        return {
          args,
          optArgs
        };
      }
      /**
       * Parses a group when the mode is changing.
       */
      parseGroupOfType(name2, type, optional) {
        switch (type) {
          case "color":
            return this.parseColorGroup(optional);
          case "size":
            return this.parseSizeGroup(optional);
          case "url":
            return this.parseUrlGroup(optional);
          case "math":
          case "text":
            return this.parseArgumentGroup(optional, type);
          case "hbox": {
            var group = this.parseArgumentGroup(optional, "text");
            return group != null ? {
              type: "styling",
              mode: group.mode,
              body: [group],
              style: "text",
              // simulate \textstyle
              resetFont: true
            } : null;
          }
          case "raw": {
            var token = this.parseStringGroup("raw", optional);
            return token != null ? {
              type: "raw",
              mode: "text",
              string: token.text
            } : null;
          }
          case "primitive": {
            if (optional) {
              throw new ParseError("A primitive argument cannot be optional");
            }
            var _group2 = this.parseGroup(name2);
            if (_group2 == null) {
              throw new ParseError("Expected group as " + name2, this.fetch());
            }
            return _group2;
          }
          case "original":
          case null:
          case void 0:
            return this.parseArgumentGroup(optional);
          default:
            throw new ParseError("Unknown group type as " + name2, this.fetch());
        }
      }
      /**
       * Discard any space tokens, fetching the next non-space token.
       */
      consumeSpaces() {
        while (this.fetch().text === " ") {
          this.consume();
        }
      }
      /**
       * Parses a group, essentially returning the string formed by the
       * brace-enclosed tokens plus some position information.
       */
      parseStringGroup(modeName, optional) {
        var argToken = this.gullet.scanArgument(optional);
        if (argToken == null) {
          return null;
        }
        var str = "";
        var nextToken;
        while ((nextToken = this.fetch()).text !== "EOF") {
          str += nextToken.text;
          this.consume();
        }
        this.consume();
        argToken.text = str;
        return argToken;
      }
      /**
       * Parses a regex-delimited group: the largest sequence of tokens
       * whose concatenated strings match `regex`. Returns the string
       * formed by the tokens plus some position information.
       */
      parseRegexGroup(regex, modeName) {
        var firstToken = this.fetch();
        var lastToken = firstToken;
        var str = "";
        var nextToken;
        while ((nextToken = this.fetch()).text !== "EOF" && regex.test(str + nextToken.text)) {
          lastToken = nextToken;
          str += lastToken.text;
          this.consume();
        }
        if (str === "") {
          throw new ParseError("Invalid " + modeName + ": '" + firstToken.text + "'", firstToken);
        }
        return firstToken.range(lastToken, str);
      }
      /**
       * Parses a color description.
       */
      parseColorGroup(optional) {
        var res = this.parseStringGroup("color", optional);
        if (res == null) {
          return null;
        }
        var match = /^(#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8}|[a-f0-9]{6}|[a-z]+)$/i.exec(res.text);
        if (!match) {
          throw new ParseError("Invalid color: '" + res.text + "'", res);
        }
        var color = match[0];
        if (/^[0-9a-f]{6}$/i.test(color)) {
          color = "#" + color;
        }
        return {
          type: "color-token",
          mode: this.mode,
          color
        };
      }
      /**
       * Parses a size specification, consisting of magnitude and unit.
       */
      parseSizeGroup(optional) {
        var res;
        var isBlank = false;
        this.gullet.consumeSpaces();
        if (!optional && this.gullet.future().text !== "{") {
          res = this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/, "size");
        } else {
          res = this.parseStringGroup("size", optional);
        }
        if (!res) {
          return null;
        }
        if (!optional && res.text.length === 0) {
          res.text = "0pt";
          isBlank = true;
        }
        var match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(res.text);
        if (!match) {
          throw new ParseError("Invalid size: '" + res.text + "'", res);
        }
        var data = {
          number: +(match[1] + match[2]),
          // sign + magnitude, cast to number
          unit: match[3]
        };
        if (!validUnit(data)) {
          throw new ParseError("Invalid unit: '" + data.unit + "'", res);
        }
        return {
          type: "size",
          mode: this.mode,
          value: data,
          isBlank
        };
      }
      /**
       * Parses an URL, checking escaped letters and allowed protocols,
       * and setting the catcode of % as an active character (as in \hyperref).
       */
      parseUrlGroup(optional) {
        this.gullet.lexer.setCatcode("%", 13);
        this.gullet.lexer.setCatcode("~", 12);
        var res = this.parseStringGroup("url", optional);
        this.gullet.lexer.setCatcode("%", 14);
        this.gullet.lexer.setCatcode("~", 13);
        if (res == null) {
          return null;
        }
        var url = res.text.replace(/\\([#$%&~_^{}])/g, "$1");
        return {
          type: "url",
          mode: this.mode,
          url
        };
      }
      /**
       * Parses an argument with the mode specified.
       */
      parseArgumentGroup(optional, mode) {
        var argToken = this.gullet.scanArgument(optional);
        if (argToken == null) {
          return null;
        }
        var outerMode = this.mode;
        if (mode) {
          this.switchMode(mode);
        }
        this.gullet.beginGroup();
        var expression = this.parseExpression(false, "EOF");
        this.expect("EOF");
        this.gullet.endGroup();
        var result = {
          type: "ordgroup",
          mode: this.mode,
          loc: argToken.loc,
          body: expression
        };
        if (mode) {
          this.switchMode(outerMode);
        }
        return result;
      }
      /**
       * Parses an ordinary group, which is either a single nucleus (like "x")
       * or an expression in braces (like "{x+y}") or an implicit group, a group
       * that starts at the current position, and ends right before a higher explicit
       * group ends, or at EOF.
       */
      parseGroup(name2, breakOnTokenText) {
        var firstToken = this.fetch();
        var text2 = firstToken.text;
        var result;
        if (text2 === "{" || text2 === "\\begingroup") {
          this.consume();
          var groupEnd = text2 === "{" ? "}" : "\\endgroup";
          this.gullet.beginGroup();
          var expression = this.parseExpression(false, groupEnd);
          var lastToken = this.fetch();
          this.expect(groupEnd);
          this.gullet.endGroup();
          result = {
            type: "ordgroup",
            mode: this.mode,
            loc: SourceLocation.range(firstToken, lastToken),
            body: expression,
            // A group formed by \begingroup...\endgroup is a semi-simple group
            // which doesn't affect spacing in math mode, i.e., is transparent.
            // https://tex.stackexchange.com/questions/1930/when-should-one-
            // use-begingroup-instead-of-bgroup
            semisimple: text2 === "\\begingroup" || void 0
          };
        } else {
          result = this.parseFunction(breakOnTokenText, name2) || this.parseSymbol();
          if (result == null && text2[0] === "\\" && !implicitCommands.hasOwnProperty(text2)) {
            if (this.settings.throwOnError) {
              throw new ParseError("Undefined control sequence: " + text2, firstToken);
            }
            result = this.formatUnsupportedCmd(text2);
            this.consume();
          }
        }
        return result;
      }
      /**
       * Form ligature-like combinations of characters for text mode.
       * This includes inputs like "--", "---", "``" and "''".
       * The result will simply replace multiple textord nodes with a single
       * character in each value by a single textord node having multiple
       * characters in its value.  The representation is still ASCII source.
       * The group will be modified in place.
       */
      formLigatures(group) {
        var n = group.length - 1;
        for (var i = 0; i < n; ++i) {
          var a = group[i];
          if (a.type !== "textord") {
            continue;
          }
          var v = a.text;
          var next = group[i + 1];
          if (!next || next.type !== "textord") {
            continue;
          }
          if (v === "-" && next.text === "-") {
            var afterNext = group[i + 2];
            if (i + 1 < n && afterNext && afterNext.type === "textord" && afterNext.text === "-") {
              group.splice(i, 3, {
                type: "textord",
                mode: "text",
                loc: SourceLocation.range(a, afterNext),
                text: "---"
              });
              n -= 2;
            } else {
              group.splice(i, 2, {
                type: "textord",
                mode: "text",
                loc: SourceLocation.range(a, next),
                text: "--"
              });
              n -= 1;
            }
          }
          if ((v === "'" || v === "`") && next.text === v) {
            group.splice(i, 2, {
              type: "textord",
              mode: "text",
              loc: SourceLocation.range(a, next),
              text: v + v
            });
            n -= 1;
          }
        }
      }
      /**
       * Parse a single symbol out of the string. Here, we handle single character
       * symbols and special functions like \verb.
       */
      parseSymbol() {
        var nucleus = this.fetch();
        var text2 = nucleus.text;
        if (/^\\verb[^a-zA-Z]/.test(text2)) {
          this.consume();
          var arg = text2.slice(5);
          var star = arg.charAt(0) === "*";
          if (star) {
            arg = arg.slice(1);
          }
          if (arg.length < 2 || arg.charAt(0) !== arg.slice(-1)) {
            throw new ParseError("\\verb assertion failed --\n                    please report what input caused this bug");
          }
          arg = arg.slice(1, -1);
          return {
            type: "verb",
            mode: "text",
            body: arg,
            star
          };
        }
        if (unicodeSymbols.hasOwnProperty(text2[0]) && !symbols[this.mode][text2[0]]) {
          if (this.settings.strict && this.mode === "math") {
            this.settings.reportNonstrict("unicodeTextInMathMode", 'Accented Unicode text character "' + text2[0] + '" used in math mode', nucleus);
          }
          text2 = unicodeSymbols[text2[0]] + text2.slice(1);
        }
        var match = combiningDiacriticalMarksEndRegex.exec(text2);
        if (match) {
          text2 = text2.substring(0, match.index);
          if (text2 === "i") {
            text2 = "\u0131";
          } else if (text2 === "j") {
            text2 = "\u0237";
          }
        }
        var symbol;
        if (symbols[this.mode][text2]) {
          if (this.settings.strict && this.mode === "math" && extraLatin.includes(text2)) {
            this.settings.reportNonstrict("unicodeTextInMathMode", 'Latin-1/Unicode text character "' + text2[0] + '" used in math mode', nucleus);
          }
          var group = symbols[this.mode][text2].group;
          var loc = SourceLocation.range(nucleus);
          var s;
          if (isAtom(group)) {
            s = {
              type: "atom",
              mode: this.mode,
              family: group,
              loc,
              text: text2
            };
          } else {
            s = {
              type: group,
              mode: this.mode,
              loc,
              text: text2
            };
          }
          symbol = s;
        } else if (text2.charCodeAt(0) >= 128) {
          if (this.settings.strict) {
            if (!supportedCodepoint(text2.charCodeAt(0))) {
              this.settings.reportNonstrict("unknownSymbol", 'Unrecognized Unicode character "' + text2[0] + '"' + (" (" + text2.charCodeAt(0) + ")"), nucleus);
            } else if (this.mode === "math") {
              this.settings.reportNonstrict("unicodeTextInMathMode", 'Unicode text character "' + text2[0] + '" used in math mode', nucleus);
            }
          }
          symbol = {
            type: "textord",
            mode: "text",
            loc: SourceLocation.range(nucleus),
            text: text2
          };
        } else {
          return null;
        }
        this.consume();
        if (match) {
          for (var i = 0; i < match[0].length; i++) {
            var accent2 = match[0][i];
            if (!unicodeAccents[accent2]) {
              throw new ParseError("Unknown accent ' " + accent2 + "'", nucleus);
            }
            var command = unicodeAccents[accent2][this.mode] || unicodeAccents[accent2].text;
            if (!command) {
              throw new ParseError("Accent " + accent2 + " unsupported in " + this.mode + " mode", nucleus);
            }
            symbol = {
              type: "accent",
              mode: this.mode,
              loc: SourceLocation.range(nucleus),
              label: command,
              isStretchy: false,
              isShifty: true,
              base: symbol
            };
          }
        }
        return symbol;
      }
    };
    Parser.endOfExpression = /* @__PURE__ */ new Set(["}", "\\endgroup", "\\end", "\\right", "&"]);
    var parseTree = function parseTree2(toParse, settings) {
      if (!(typeof toParse === "string" || toParse instanceof String)) {
        throw new TypeError("KaTeX can only parse string typed expression");
      }
      var parser = new Parser(toParse, settings);
      delete parser.gullet.macros.current["\\df@tag"];
      var tree = parser.parse();
      delete parser.gullet.macros.current["\\current@color"];
      delete parser.gullet.macros.current["\\color"];
      if (parser.gullet.macros.get("\\df@tag")) {
        if (!settings.displayMode) {
          throw new ParseError("\\tag works only in display equations");
        }
        tree = [{
          type: "tag",
          mode: "text",
          body: tree,
          tag: parser.subparse([new Token("\\df@tag")])
        }];
      }
      return tree;
    };
    var render = function render2(expression, baseNode, options) {
      baseNode.textContent = "";
      var node = renderToDomTree(expression, options).toNode();
      baseNode.appendChild(node);
    };
    if (typeof document !== "undefined") {
      if (document.compatMode !== "CSS1Compat") {
        typeof console !== "undefined" && console.warn("Warning: KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype.");
        render = function render3() {
          throw new ParseError("KaTeX doesn't work in quirks mode.");
        };
      }
    }
    var renderToString = function renderToString2(expression, options) {
      var markup = renderToDomTree(expression, options).toMarkup();
      return markup;
    };
    var generateParseTree = function generateParseTree2(expression, options) {
      var settings = new Settings(options);
      return parseTree(expression, settings);
    };
    var renderError = function renderError2(error, expression, options) {
      if (options.throwOnError || !(error instanceof ParseError)) {
        throw error;
      }
      var node = makeSpan(["katex-error"], [new SymbolNode(expression)]);
      node.setAttribute("title", error.toString());
      node.setAttribute("style", "color:" + options.errorColor);
      return node;
    };
    var renderToDomTree = function renderToDomTree2(expression, options) {
      var settings = new Settings(options);
      try {
        var tree = parseTree(expression, settings);
        return buildTree(tree, expression, settings);
      } catch (error) {
        return renderError(error, expression, settings);
      }
    };
    var renderToHTMLTree = function renderToHTMLTree2(expression, options) {
      var settings = new Settings(options);
      try {
        var tree = parseTree(expression, settings);
        return buildHTMLTree(tree, expression, settings);
      } catch (error) {
        return renderError(error, expression, settings);
      }
    };
    var version = "0.16.47";
    var __domTree = {
      Span,
      Anchor,
      SymbolNode,
      SvgNode,
      PathNode,
      LineNode
    };
    var katex = {
      /**
       * Current KaTeX version
       */
      version,
      /**
       * Renders the given LaTeX into an HTML+MathML combination, and adds
       * it as a child to the specified DOM node.
       */
      render,
      /**
       * Renders the given LaTeX into an HTML+MathML combination string,
       * for sending to the client.
       */
      renderToString,
      /**
       * KaTeX error, usually during parsing.
       */
      ParseError,
      /**
       * The schema of Settings
       */
      SETTINGS_SCHEMA,
      /**
       * Parses the given LaTeX into KaTeX's internal parse tree structure,
       * without rendering to HTML or MathML.
       *
       * NOTE: This method is not currently recommended for public use.
       * The internal tree representation is unstable and is very likely
       * to change. Use at your own risk.
       */
      __parse: generateParseTree,
      /**
       * Renders the given LaTeX into an HTML+MathML internal DOM tree
       * representation, without flattening that representation to a string.
       *
       * NOTE: This method is not currently recommended for public use.
       * The internal tree representation is unstable and is very likely
       * to change. Use at your own risk.
       */
      __renderToDomTree: renderToDomTree,
      /**
       * Renders the given LaTeX into an HTML internal DOM tree representation,
       * without MathML and without flattening that representation to a string.
       *
       * NOTE: This method is not currently recommended for public use.
       * The internal tree representation is unstable and is very likely
       * to change. Use at your own risk.
       */
      __renderToHTMLTree: renderToHTMLTree,
      /**
       * extends internal font metrics object with a new object
       * each key in the new object represents a font name
      */
      __setFontMetrics: setFontMetrics,
      /**
       * adds a new symbol to builtin symbols table
       */
      __defineSymbol: defineSymbol,
      /**
       * adds a new function to builtin function list,
       * which directly produce parse tree elements
       * and have their own html/mathml builders
       */
      __defineFunction: defineFunction,
      /**
       * adds a new macro to builtin macro list
       */
      __defineMacro: defineMacro,
      /**
       * Expose the dom tree node types, which can be useful for type checking nodes.
       *
       * NOTE: These methods are not currently recommended for public use.
       * The internal tree representation is unstable and is very likely
       * to change. Use at your own risk.
       */
      __domTree
    };

    // packages/teaching-core/src/render/math.ts
    var MAX_LATEX_LENGTH = 4e3;
    function katexToHtml(latex, displayMode) {
      const source = latex.length > MAX_LATEX_LENGTH ? latex.slice(0, MAX_LATEX_LENGTH) : latex;
      try {
        return katex.renderToString(source, {
          displayMode,
          throwOnError: false,
          trust: false,
          strict: "ignore",
          output: "html",
          maxSize: 40,
          maxExpand: 1e3,
          globalGroup: false
        });
      } catch {
        return "";
      }
    }
    function renderMath(latex, displayMode, environment) {
      const document2 = environment?.document ?? globalThis.document;
      if (document2 === void 0) throw new Error("renderMath \u9700\u8981 Document");
      const wrapper = createElement(document2, displayMode ? "div" : "span", {
        className: displayMode ? "teaching-math-block" : "teaching-math-inline"
      });
      const html = katexToHtml(latex, displayMode);
      if (html === "") {
        wrapper.textContent = latex;
        wrapper.setAttribute("title", "\u516C\u5F0F\u65E0\u6CD5\u6E32\u67D3\uFF0C\u5DF2\u663E\u793A\u539F\u59CB LaTeX");
        return wrapper;
      }
      ;
      wrapper.innerHTML = html;
      wrapper.setAttribute("data-latex-source", latex.length > 400 ? `${latex.slice(0, 400)}\u2026` : latex);
      return wrapper;
    }

    // packages/teaching-core/src/render/markdown.ts
    var SAFE_LINK = /^https?:\/\//iu;
    var MAX_SOURCE_LENGTH = 2e5;
    var MAX_CODE_BLOCK = 1e5;
    function parseInlineMarkdown(source) {
      const result = [];
      let buffer = "";
      const flush = () => {
        if (buffer !== "") {
          result.push({ type: "text", text: buffer });
          buffer = "";
        }
      };
      let index = 0;
      while (index < source.length) {
        const char = source[index] ?? "";
        if (char === "\\" && index + 1 < source.length) {
          buffer += source[index + 1] ?? "";
          index += 2;
          continue;
        }
        if (char === "\n") {
          if (buffer.endsWith("  ")) {
            buffer = buffer.slice(0, -2);
            flush();
            result.push({ type: "break" });
          } else {
            buffer += " ";
          }
          index += 1;
          continue;
        }
        if (char === "`") {
          const close2 = source.indexOf("`", index + 1);
          if (close2 > index + 1) {
            flush();
            result.push({ type: "code", text: source.slice(index + 1, close2) });
            index = close2 + 1;
            continue;
          }
        }
        if (char === "*" || char === "_") {
          const double = source.startsWith(char + char, index);
          const marker = double ? char + char : char;
          const end = source.indexOf(marker, index + marker.length);
          if (end > index + marker.length) {
            const inner2 = source.slice(index + marker.length, end);
            flush();
            const children = parseInlineMarkdown(inner2);
            result.push(double ? { type: "strong", children } : { type: "em", children });
            index = end + marker.length;
            continue;
          }
        }
        if (char === "$") {
          const close2 = source.indexOf("$", index + 1);
          if (close2 > index + 1 && !source.startsWith("$$", index)) {
            const latex = source.slice(index + 1, close2);
            if (latex.trim() !== "" && latex.length <= 2e3) {
              flush();
              result.push({ type: "math", latex });
              index = close2 + 1;
              continue;
            }
          }
        }
        if (char === "[") {
          const closeBracket = source.indexOf("]", index + 1);
          if (closeBracket > index + 1 && source[closeBracket + 1] === "(") {
            const closeParen = source.indexOf(")", closeBracket + 2);
            if (closeParen > closeBracket + 2) {
              const label = source.slice(index + 1, closeBracket);
              const href = source.slice(closeBracket + 2, closeParen).trim();
              if (SAFE_LINK.test(href)) {
                flush();
                result.push({ type: "link", href, children: parseInlineMarkdown(label) });
                index = closeParen + 1;
                continue;
              }
              flush();
              result.push(...parseInlineMarkdown(label));
              index = closeParen + 1;
              continue;
            }
          }
        }
        buffer += char;
        index += 1;
      }
      flush();
      return result;
    }
    function parseMarkdown(source) {
      const bounded = source.length > MAX_SOURCE_LENGTH ? source.slice(0, MAX_SOURCE_LENGTH) : source;
      const lines = bounded.replace(/\r\n?/gu, "\n").split("\n");
      const blocks = [];
      let index = 0;
      while (index < lines.length) {
        const line = lines[index] ?? "";
        const trimmed = line.trim();
        if (trimmed === "") {
          index += 1;
          continue;
        }
        const fence = /^```([A-Za-z0-9_+#.-]*)\s*$/u.exec(trimmed);
        if (fence !== null) {
          const language = fence[1] === "" ? void 0 : fence[1];
          const codeLines = [];
          index += 1;
          while (index < lines.length && (lines[index] ?? "").trim() !== "```") {
            codeLines.push(lines[index] ?? "");
            index += 1;
          }
          index += 1;
          const code = codeLines.join("\n");
          blocks.push({ type: "code", code: code.length > MAX_CODE_BLOCK ? code.slice(0, MAX_CODE_BLOCK) : code, ...language !== void 0 ? { language } : {} });
          continue;
        }
        if (trimmed === "$$") {
          const mathLines = [];
          index += 1;
          while (index < lines.length && (lines[index] ?? "").trim() !== "$$") {
            mathLines.push(lines[index] ?? "");
            index += 1;
          }
          index += 1;
          blocks.push({ type: "math", latex: mathLines.join("\n") });
          continue;
        }
        const heading = /^(#{1,4})\s+(.*)$/u.exec(trimmed);
        if (heading !== null) {
          const level = (heading[1] ?? "#").length;
          blocks.push({ type: "heading", level, children: parseInlineMarkdown(heading[2] ?? "") });
          index += 1;
          continue;
        }
        if (/^(?:-{3,}|\*{3,}|_{3,})$/u.test(trimmed)) {
          blocks.push({ type: "rule" });
          index += 1;
          continue;
        }
        if (/^>\s?/u.test(trimmed)) {
          const quoteLines = [];
          while (index < lines.length && /^>\s?/u.test((lines[index] ?? "").trim())) {
            quoteLines.push((lines[index] ?? "").trim().replace(/^>\s?/u, ""));
            index += 1;
          }
          blocks.push({ type: "quote", blocks: parseMarkdown(quoteLines.join("\n")) });
          continue;
        }
        const listItem = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/u.exec(line);
        if (listItem !== null) {
          const ordered = /\d/u.test(listItem[2] ?? "-");
          const items = [];
          while (index < lines.length) {
            const current = lines[index] ?? "";
            const item = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/u.exec(current);
            if (item !== null) {
              items.push([...parseInlineMarkdown(item[3] ?? "")]);
              index += 1;
              continue;
            }
            if (current.trim() !== "" && /^\s+/u.test(current) && items.length > 0) {
              const last = items[items.length - 1];
              if (last !== void 0) last.push({ type: "text", text: " " }, ...parseInlineMarkdown(current.trim()));
              index += 1;
              continue;
            }
            break;
          }
          blocks.push({ type: "list", ordered, items });
          continue;
        }
        const paragraphLines = [line];
        index += 1;
        while (index < lines.length) {
          const next = lines[index] ?? "";
          const nextTrimmed = next.trim();
          if (nextTrimmed === "" || /^```/u.test(nextTrimmed) || /^#{1,4}\s+/u.test(nextTrimmed) || /^>\s?/u.test(nextTrimmed) || nextTrimmed === "$$" || /^(?:-{3,}|\*{3,}|_{3,})$/u.test(nextTrimmed)) {
            break;
          }
          paragraphLines.push(next);
          index += 1;
        }
        blocks.push({ type: "paragraph", children: parseInlineMarkdown(paragraphLines.join("\n")) });
      }
      return blocks;
    }
    function appendInlineTokens(document2, parent, tokens, environment) {
      for (const token of tokens) {
        if (token.type === "text") parent.appendChild(document2.createTextNode(token.text));
        else if (token.type === "break") parent.appendChild(createElement(document2, "br"));
        else if (token.type === "code") {
          parent.appendChild(createElement(document2, "code", { className: "teaching-code-inline", text: token.text }));
        } else if (token.type === "strong" || token.type === "em") {
          const element = createElement(document2, token.type === "strong" ? "strong" : "em");
          appendInlineTokens(document2, element, token.children, environment);
          parent.appendChild(element);
        } else if (token.type === "link") {
          const anchor = createElement(document2, "a", {
            className: "teaching-link",
            attrs: { href: token.href, target: "_blank", rel: "noopener noreferrer" }
          });
          appendInlineTokens(document2, anchor, token.children, environment);
          parent.appendChild(anchor);
        } else if (token.type === "math") {
          parent.appendChild(renderMath(token.latex, false, environment));
        }
      }
    }
    function renderMarkdown(document2, source, environment) {
      const wrapper = createElement(document2, "div", { className: "teaching-markdown" });
      appendMarkdownBlocks(wrapper, document2, parseMarkdown(source), environment ?? { document: document2 });
      return wrapper;
    }
    function appendMarkdownBlocks(parent, document2, blocks, environment) {
      for (const block of blocks) {
        if (block.type === "heading") {
          const heading = createElement(document2, `h${block.level}`, { className: `teaching-h${block.level}` });
          appendInlineTokens(document2, heading, block.children, environment);
          parent.appendChild(heading);
        } else if (block.type === "paragraph") {
          const paragraph = createElement(document2, "p", { className: "teaching-p" });
          appendInlineTokens(document2, paragraph, block.children, environment);
          parent.appendChild(paragraph);
        } else if (block.type === "list") {
          const list = createElement(document2, block.ordered ? "ol" : "ul", { className: "teaching-list" });
          for (const item of block.items) {
            const li = createElement(document2, "li");
            appendInlineTokens(document2, li, item, environment);
            list.appendChild(li);
          }
          parent.appendChild(list);
        } else if (block.type === "code") {
          const pre = createElement(document2, "pre", { className: "teaching-code-block" });
          const code = createElement(document2, "code", { text: block.code });
          if (block.language !== void 0) code.setAttribute("data-language", block.language);
          pre.appendChild(code);
          parent.appendChild(pre);
        } else if (block.type === "math") {
          parent.appendChild(renderMath(block.latex, true, environment));
        } else if (block.type === "quote") {
          const quote = createElement(document2, "blockquote", { className: "teaching-quote" });
          appendMarkdownBlocks(quote, document2, block.blocks, environment);
          parent.appendChild(quote);
        } else if (block.type === "rule") {
          parent.appendChild(createElement(document2, "hr", { className: "teaching-rule" }));
        }
      }
    }

    // packages/teaching-core/src/render/code-run.ts
    function createClientRunId(now = Date.now, random = Math.random) {
      const stamp = Math.floor(now()).toString(36).toLowerCase();
      const suffix = Math.floor(random() * 16777216).toString(36).padStart(5, "0").slice(0, 8);
      return `run-client-${stamp}-${suffix}`;
    }
    var VERIFICATION_LABEL = {
      objective: "\u5BA2\u89C2\u6821\u9A8C",
      exploratory: "\u63A2\u7D22\u6027\u8FD0\u884C\uFF08\u65E0\u5BA2\u89C2\u68C0\u67E5\uFF09",
      unverified: "\u672A\u9A8C\u8BC1"
    };
    function mountCodeRun(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const disposers = [];
      let currentCode = options.code ?? payload.code;
      let busy = false;
      let lastResult = null;
      let lastRunId;
      let activeRunId;
      const wrapper = createElement(document2, "div", { className: "teaching-code-run" });
      if (payload.title !== void 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: payload.title,
          styles: { fontWeight: "600", fontSize: "13px", marginBottom: "4px" }
        }));
      }
      if (payload.instructions !== void 0) {
        const instructions = createElement(document2, "div", { className: "teaching-code-run-instructions" });
        appendMarkdownBlocks(instructions, document2, parseMarkdown(payload.instructions), options);
        wrapper.appendChild(instructions);
      }
      wrapper.appendChild(createElement(document2, "div", {
        text: `\u8BED\u8A00\uFF1A${payload.language}${payload.dialect !== void 0 ? `\uFF08${payload.dialect} \u65B9\u8A00\uFF09` : ""}${(payload.requires ?? []).length > 0 ? ` \xB7 \u9884\u7F6E\uFF1A${(payload.requires ?? []).join("\u3001")}` : ""}`,
        styles: { fontSize: "11px", opacity: "0.65", margin: "2px 0 6px" }
      }));
      const editor = createElement(document2, "textarea", {
        className: "teaching-code-editor",
        attrs: {
          "aria-label": "\u4EE3\u7801\u7F16\u8F91\u5668",
          rows: String(Math.min(20, Math.max(6, currentCode.split("\n").length + 1))),
          spellcheck: "false",
          ...payload.editable ? {} : { readonly: "readonly" }
        },
        styles: {
          width: "100%",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: "12px",
          lineHeight: "1.5",
          padding: "8px",
          borderRadius: "8px",
          border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3))",
          background: "var(--dsw-alias-bg-base, transparent)",
          color: "inherit",
          resize: "vertical",
          boxSizing: "border-box"
        }
      });
      editor.value = currentCode;
      disposers.push(on(editor, "input", () => {
        currentCode = editor.value;
        options.onChange?.(currentCode);
      }));
      wrapper.appendChild(editor);
      const controls = createElement(document2, "div", {
        className: "teaching-code-run-controls",
        styles: { display: "flex", gap: "8px", marginTop: "8px", alignItems: "center", flexWrap: "wrap" }
      });
      const runButton = createElement(document2, "button", {
        text: "\u8FD0\u884C",
        ariaLabel: "\u8FD0\u884C\u4EE3\u7801",
        attrs: { type: "button" },
        styles: { fontSize: "12px", padding: "4px 14px", cursor: "pointer" }
      });
      const stopButton = createElement(document2, "button", {
        text: "\u505C\u6B62",
        ariaLabel: "\u505C\u6B62\u8FD0\u884C",
        attrs: { type: "button" },
        styles: { fontSize: "12px", padding: "4px 14px", cursor: "pointer", display: "none" }
      });
      const resetButton = payload.starterCode !== void 0 ? createElement(document2, "button", {
        text: "\u91CD\u7F6E\u4E3A\u8D77\u59CB\u4EE3\u7801",
        ariaLabel: "\u91CD\u7F6E\u4E3A\u8D77\u59CB\u4EE3\u7801",
        attrs: { type: "button" },
        styles: { fontSize: "12px", padding: "4px 12px", cursor: "pointer" }
      }) : void 0;
      const statusLine = createElement(document2, "span", {
        className: "teaching-code-run-status",
        text: "",
        styles: { fontSize: "12px", opacity: "0.8" }
      });
      const output = createElement(document2, "div", {
        className: "teaching-code-run-output",
        styles: { marginTop: "8px" }
      });
      const setBusy = (value) => {
        busy = value;
        runButton.disabled = value;
        if (options.onCancel !== void 0) stopButton.style.display = value ? "" : "none";
        if (value) statusLine.textContent = "\u8FD0\u884C\u4E2D\u2026\uFF08\u6709\u8D85\u65F6\u9650\u5236\uFF0C\u53EF\u505C\u6B62\uFF09";
      };
      const renderResult = (result) => {
        clearElement(output);
        lastResult = result;
        if (result === null) return;
        lastRunId = result.runId;
        const parts = [`\u8FD0\u884C\u7ED3\u679C\uFF1A${result.status}`];
        if (result.exitCode !== void 0) parts.push(`\u9000\u51FA\u7801 ${String(result.exitCode)}`);
        if (result.durationMs !== void 0) parts.push(`${result.durationMs}ms`);
        if (result.verification !== void 0) parts.push(VERIFICATION_LABEL[result.verification] ?? result.verification);
        statusLine.textContent = parts.join(" \xB7 ");
        if (result.errorMessage !== void 0) {
          output.appendChild(createElement(document2, "div", {
            text: result.errorMessage,
            styles: { color: "var(--dsw-alias-state-warn-primary, #b45309)", fontSize: "12px", whiteSpace: "pre-wrap" }
          }));
        }
        if (result.stdout !== "") {
          output.appendChild(createElement(document2, "div", { text: "stdout", styles: { fontSize: "11px", opacity: "0.6", marginTop: "6px" } }));
          output.appendChild(createElement(document2, "pre", {
            className: "teaching-code-run-stdout",
            text: result.stdout,
            styles: {
              margin: "2px 0",
              padding: "8px",
              borderRadius: "6px",
              maxHeight: "260px",
              overflow: "auto",
              background: "var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08))",
              fontSize: "12px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }
          }));
        }
        if (result.stderr !== "") {
          output.appendChild(createElement(document2, "div", { text: "stderr", styles: { fontSize: "11px", opacity: "0.6", marginTop: "6px" } }));
          output.appendChild(createElement(document2, "pre", {
            className: "teaching-code-run-stderr",
            text: result.stderr,
            styles: {
              margin: "2px 0",
              padding: "8px",
              borderRadius: "6px",
              maxHeight: "200px",
              overflow: "auto",
              background: "rgba(239,68,68,0.08)",
              color: "var(--dsw-alias-state-error-primary, #b91c1c)",
              fontSize: "12px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }
          }));
        }
        if (result.checks !== void 0 && result.checks.length > 0) {
          const list = createElement(document2, "ul", { styles: { margin: "6px 0 0", paddingLeft: "18px", fontSize: "12px" } });
          for (const check of result.checks) {
            const marker = check.status === "pass" ? "\u2713" : check.status === "fail" ? "\u2717" : "\xB7";
            list.appendChild(createElement(document2, "li", {
              text: `${marker} ${check.name}${check.detail !== void 0 ? ` \u2014 ${check.detail}` : ""}`,
              styles: { color: check.status === "fail" ? "var(--dsw-alias-state-error-primary, #b91c1c)" : "inherit" }
            }));
          }
          output.appendChild(list);
        }
        if (result.resourceNote !== void 0) {
          output.appendChild(createElement(document2, "div", {
            text: `\u8BF4\u660E\uFF1A${result.resourceNote}`,
            styles: { fontSize: "11px", opacity: "0.6", marginTop: "6px" }
          }));
        }
        if (result.stdout === "" && result.stderr === "" && result.errorMessage === void 0) {
          output.appendChild(createElement(document2, "div", {
            text: "\uFF08\u6CA1\u6709\u8F93\u51FA\uFF09",
            styles: { fontSize: "12px", opacity: "0.6" }
          }));
        }
      };
      const doRun = async () => {
        if (busy) return;
        if (options.onRun === void 0) {
          statusLine.textContent = "\u79BB\u7EBF\u5BFC\u51FA\u9875\u9762\u4E0D\u6267\u884C\u539F\u751F\u4EE3\u7801\uFF1B\u8BF7\u6309\u73AF\u5883\u8BF4\u660E\u5728\u672C\u673A\u8FD0\u884C\u3002";
          return;
        }
        setBusy(true);
        const clientRunId = createClientRunId();
        activeRunId = clientRunId;
        lastRunId = clientRunId;
        try {
          const result = await options.onRun({
            clientRunId,
            code: currentCode,
            language: payload.language,
            ...payload.dialect !== void 0 ? { dialect: payload.dialect } : {},
            ...payload.stdin !== void 0 ? { stdin: payload.stdin } : {}
          });
          renderResult(result);
        } catch (error) {
          renderResult({
            status: "failed",
            stdout: "",
            stderr: "",
            errorMessage: `\u8FD0\u884C\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`
          });
        } finally {
          activeRunId = void 0;
          setBusy(false);
        }
      };
      disposers.push(on(runButton, "click", () => {
        void doRun();
      }));
      disposers.push(on(stopButton, "click", () => {
        const runId = activeRunId ?? lastRunId;
        if (runId !== void 0) void options.onCancel?.(runId);
      }));
      if (resetButton !== void 0) {
        disposers.push(on(resetButton, "click", () => {
          currentCode = payload.starterCode ?? "";
          editor.value = currentCode;
          options.onChange?.(currentCode);
        }));
      }
      controls.appendChild(runButton);
      if (options.onCancel !== void 0) controls.appendChild(stopButton);
      if (resetButton !== void 0) controls.appendChild(resetButton);
      controls.appendChild(statusLine);
      wrapper.appendChild(controls);
      wrapper.appendChild(output);
      if (options.onRun === void 0) {
        runButton.disabled = true;
        wrapper.appendChild(createElement(document2, "p", {
          className: "teaching-code-run-offline",
          text: "\u79BB\u7EBF\u9875\u9762\uFF1A\u4E0D\u6267\u884C\u539F\u751F\u4EE3\u7801\uFF0C\u4EC5\u4FDD\u7559\u4EE3\u7801\u4E0E\u8FD0\u884C\u8BF4\u660E\u3002",
          styles: { fontSize: "11px", opacity: "0.65", marginTop: "6px" }
        }));
      }
      if (payload.tests !== void 0 && payload.tests.length > 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: `\u5BA2\u89C2\u68C0\u67E5\uFF1A${payload.tests.map((test) => `${test.name}\uFF08${test.type}\uFF09`).join("\u3001")}`,
          styles: { fontSize: "11px", opacity: "0.6", marginTop: "6px" }
        }));
      }
      container.appendChild(wrapper);
      return {
        element: wrapper,
        getCode: () => currentCode,
        setCode: (code) => {
          currentCode = code;
          editor.value = code;
          options.onChange?.(code);
        },
        run: doRun,
        setResult: renderResult,
        dispose: () => {
          for (const dispose of disposers) dispose();
          disposers.length = 0;
          clearElement(wrapper);
          wrapper.remove();
          lastResult = null;
        }
      };
    }

    // packages/teaching-core/src/render/derivation.ts
    function mountDerivation(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const steps = payload.steps;
      const known = new Set(steps.map((step) => step.id));
      const revealed = new Set((options.revealedStepIds ?? []).filter((id) => known.has(id)));
      const disposers = [];
      const wrapper = createElement(document2, "div", { className: "teaching-derivation" });
      if (payload.claim !== void 0) {
        wrapper.appendChild(createElement(document2, "p", {
          className: "teaching-derivation-claim",
          text: payload.claim,
          styles: { fontWeight: "600", margin: "0 0 8px" }
        }));
      }
      const list = createElement(document2, "ol", {
        className: "teaching-derivation-steps",
        styles: { listStyle: "none", padding: "0", margin: "0", display: "grid", gap: "8px" }
      });
      const stepNodes = /* @__PURE__ */ new Map();
      const stepIndex = new Map(steps.map((step, index) => [step.id, index + 1]));
      for (const step of steps) {
        const item = createElement(document2, "li", {
          className: "teaching-derivation-step",
          styles: {
            border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25))",
            borderRadius: "8px",
            padding: "8px 10px",
            background: "var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.06))"
          }
        });
        const node = createElement(document2, "div");
        item.appendChild(node);
        stepNodes.set(step.id, { item, node });
        list.appendChild(item);
      }
      wrapper.appendChild(list);
      const conclusion = payload.conclusion !== void 0 ? createElement(document2, "p", {
        className: "teaching-derivation-conclusion",
        text: `\u7ED3\u8BBA\uFF1A${payload.conclusion}`,
        styles: { marginTop: "8px", fontWeight: "600" }
      }) : void 0;
      if (conclusion !== void 0) {
        conclusion.style.display = "none";
        wrapper.appendChild(conclusion);
      }
      const renderSteps = () => {
        for (const step of steps) {
          const entry = stepNodes.get(step.id);
          if (entry === void 0) continue;
          clearElement(entry.node);
          const hidden = !revealed.has(step.id);
          if (hidden) {
            entry.item.setAttribute("data-revealed", "false");
            entry.node.appendChild(createElement(document2, "button", {
              text: `\u63ED\u793A\u7B2C ${stepIndex.get(step.id) ?? "?"} \u6B65`,
              ariaLabel: `\u63ED\u793A\u7B2C ${stepIndex.get(step.id) ?? "?"} \u6B65`,
              attrs: { type: "button" },
              styles: { fontSize: "12px", padding: "3px 10px", cursor: "pointer" }
            }));
            const button = entry.node.firstChild;
            if (button !== null) {
              disposers.push(on(button, "click", () => {
                revealed.add(step.id);
                renderSteps();
                refreshButtons();
                options.onChange?.([...revealed], "reveal");
              }));
            }
            continue;
          }
          entry.item.setAttribute("data-revealed", "true");
          const heading = createElement(document2, "div", {
            text: `\u7B2C ${stepIndex.get(step.id) ?? "?"} \u6B65`,
            styles: { fontSize: "11px", opacity: "0.6", marginBottom: "2px" }
          });
          entry.node.appendChild(heading);
          entry.node.appendChild(renderMath(step.latex, true, options));
          if (step.note !== void 0) {
            entry.node.appendChild(createElement(document2, "div", {
              text: step.note,
              styles: { fontSize: "12px", opacity: "0.8", marginTop: "4px" }
            }));
          }
          if (step.dependsOn !== void 0 && step.dependsOn.length > 0) {
            entry.node.appendChild(createElement(document2, "div", {
              text: `\u4F9D\u636E\uFF1A\u7B2C ${step.dependsOn.map((id) => stepIndex.get(id)).filter((index) => index !== void 0).join("\u3001")} \u6B65`,
              styles: { fontSize: "11px", opacity: "0.65", marginTop: "4px" }
            }));
          }
          if (step.anchor !== void 0) {
            entry.node.appendChild(createElement(document2, "div", {
              text: `\u6765\u6E90\uFF1A${step.anchor.label}`,
              title: step.anchor.excerpt,
              styles: { fontSize: "11px", opacity: "0.65", marginTop: "4px" }
            }));
          }
        }
        if (conclusion !== void 0) {
          conclusion.style.display = revealed.size === steps.length ? "" : "none";
        }
      };
      const controls = createElement(document2, "div", {
        className: "teaching-derivation-controls",
        styles: { display: "flex", gap: "8px", marginTop: "10px" }
      });
      const nextButton = createElement(document2, "button", {
        text: "\u63ED\u793A\u4E0B\u4E00\u6B65",
        ariaLabel: "\u63ED\u793A\u4E0B\u4E00\u6B65",
        attrs: { type: "button" },
        styles: { fontSize: "12px", padding: "4px 12px", cursor: "pointer" }
      });
      const allButton = createElement(document2, "button", {
        text: "\u5168\u90E8\u63ED\u793A",
        ariaLabel: "\u5168\u90E8\u63ED\u793A\u6B65\u9AA4",
        attrs: { type: "button" },
        styles: { fontSize: "12px", padding: "4px 12px", cursor: "pointer" }
      });
      const refreshButtons = () => {
        const next = steps.find((step) => !revealed.has(step.id));
        nextButton.disabled = next === void 0;
        allButton.disabled = next === void 0;
      };
      disposers.push(on(nextButton, "click", () => {
        const next = steps.find((step) => !revealed.has(step.id));
        if (next === void 0) return;
        revealed.add(next.id);
        renderSteps();
        refreshButtons();
        options.onChange?.([...revealed], "reveal");
      }));
      disposers.push(on(allButton, "click", () => {
        for (const step of steps) revealed.add(step.id);
        renderSteps();
        refreshButtons();
        options.onChange?.([...revealed], "reveal-all");
      }));
      controls.appendChild(nextButton);
      controls.appendChild(allButton);
      wrapper.appendChild(controls);
      renderSteps();
      refreshButtons();
      if (revealed.size > 0) options.onChange?.([...revealed], "restore");
      container.appendChild(wrapper);
      return {
        element: wrapper,
        getRevealed: () => [...revealed],
        revealNext: () => {
          const next = steps.find((step) => !revealed.has(step.id));
          if (next === void 0) return void 0;
          revealed.add(next.id);
          renderSteps();
          refreshButtons();
          options.onChange?.([...revealed], "reveal");
          return next.id;
        },
        revealAll: () => {
          for (const step of steps) revealed.add(step.id);
          renderSteps();
          refreshButtons();
          options.onChange?.([...revealed], "reveal-all");
        },
        dispose: () => {
          for (const dispose of disposers) dispose();
          disposers.length = 0;
          clearElement(wrapper);
          wrapper.remove();
        }
      };
    }

    // packages/teaching-core/src/render/expr.ts
    var ExpressionError = class extends Error {
      name = "ExpressionError";
      constructor(message) {
        super(message);
      }
    };
    var MAX_SOURCE_LENGTH2 = 500;
    var MAX_DEPTH = 64;
    var CONSTANTS = {
      pi: Math.PI,
      e: Math.E,
      tau: Math.PI * 2
    };
    var UNARY_FUNCTIONS = {
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      asin: Math.asin,
      acos: Math.acos,
      atan: Math.atan,
      exp: Math.exp,
      log: Math.log,
      ln: Math.log,
      sqrt: Math.sqrt,
      abs: Math.abs,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      sign: Math.sign
    };
    var MIN_MAX_LENGTH = 2;
    var BINARY_FUNCTIONS = ["min", "max", "pow", "atan2"];
    function tokenize(source) {
      const tokens = [];
      let index = 0;
      while (index < source.length) {
        const char = source[index] ?? "";
        if (/\s/u.test(char)) {
          index += 1;
          continue;
        }
        if (/[0-9.]/u.test(char)) {
          const match = /^\d*\.?\d+(?:[eE][+-]?\d+)?/u.exec(source.slice(index));
          if (match === null) throw new ExpressionError(`\u65E0\u6CD5\u89E3\u6790\u6570\u5B57\uFF08\u4F4D\u7F6E ${index + 1}\uFF09`);
          const text2 = match[0];
          if (text2 === "." || text2 === "") throw new ExpressionError(`\u65E0\u6CD5\u89E3\u6790\u6570\u5B57\uFF08\u4F4D\u7F6E ${index + 1}\uFF09`);
          tokens.push({ type: "number", text: text2, position: index });
          index += text2.length;
          continue;
        }
        if (/[A-Za-z_\u4e00-\u9fa5]/u.test(char)) {
          const match = /^[A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5]*/u.exec(source.slice(index));
          const text2 = match?.[0] ?? char;
          tokens.push({ type: "name", text: text2, position: index });
          index += text2.length;
          continue;
        }
        if ("+-*/^%".includes(char)) {
          tokens.push({ type: "op", text: char, position: index });
          index += 1;
          continue;
        }
        if (char === "(" || char === "\uFF08") {
          tokens.push({ type: "lparen", text: "(", position: index });
          index += 1;
          continue;
        }
        if (char === ")" || char === "\uFF09") {
          tokens.push({ type: "rparen", text: ")", position: index });
          index += 1;
          continue;
        }
        if (char === "," || char === "\uFF0C") {
          tokens.push({ type: "comma", text: ",", position: index });
          index += 1;
          continue;
        }
        throw new ExpressionError(`\u8868\u8FBE\u5F0F\u4E2D\u51FA\u73B0\u4E0D\u652F\u6301\u7684\u5B57\u7B26\u300C${char}\u300D\uFF08\u4F4D\u7F6E ${index + 1}\uFF09`);
      }
      tokens.push({ type: "end", text: "", position: source.length });
      return tokens;
    }
    var Parser2 = class {
      tokens;
      variables;
      index = 0;
      depth = 0;
      constructor(tokens, variables) {
        this.tokens = tokens;
        this.variables = variables === void 0 ? void 0 : new Set(variables);
      }
      peek() {
        return this.tokens[this.index] ?? { type: "end", text: "", position: 0 };
      }
      next() {
        const token = this.peek();
        this.index += 1;
        return token;
      }
      expect(type, what) {
        const token = this.next();
        if (token.type !== type) throw new ExpressionError(`\u8868\u8FBE\u5F0F\u8BED\u6CD5\u9519\u8BEF\uFF1A\u671F\u671B ${what}\uFF0C\u5F97\u5230\u300C${token.text || "\u7ED3\u5C3E"}\u300D`);
        return token;
      }
      enter() {
        this.depth += 1;
        if (this.depth > MAX_DEPTH) throw new ExpressionError("\u8868\u8FBE\u5F0F\u5D4C\u5957\u8FC7\u6DF1");
      }
      leave() {
        this.depth -= 1;
      }
      parse() {
        const ast = this.parseAdditive();
        if (this.peek().type !== "end") {
          throw new ExpressionError(`\u8868\u8FBE\u5F0F\u8BED\u6CD5\u9519\u8BEF\uFF1A\u591A\u4F59\u7684\u300C${this.peek().text}\u300D`);
        }
        return ast;
      }
      parseAdditive() {
        this.enter();
        try {
          let left = this.parseMultiplicative();
          for (; ; ) {
            const token = this.peek();
            if (token.type === "op" && (token.text === "+" || token.text === "-")) {
              this.next();
              const right = this.parseMultiplicative();
              left = { kind: "binary", op: token.text, left, right };
            } else {
              return left;
            }
          }
        } finally {
          this.leave();
        }
      }
      parseMultiplicative() {
        this.enter();
        try {
          let left = this.parseUnary();
          for (; ; ) {
            const token = this.peek();
            if (token.type === "op" && (token.text === "*" || token.text === "/" || token.text === "%")) {
              this.next();
              const right = this.parseUnary();
              left = { kind: "binary", op: token.text, left, right };
            } else {
              return left;
            }
          }
        } finally {
          this.leave();
        }
      }
      parseUnary() {
        const token = this.peek();
        if (token.type === "op" && (token.text === "+" || token.text === "-")) {
          this.next();
          const operand = this.parseUnary();
          return token.text === "-" ? { kind: "negate", operand } : operand;
        }
        return this.parsePower();
      }
      parsePower() {
        this.enter();
        try {
          const base = this.parsePrimary();
          const token = this.peek();
          if (token.type === "op" && token.text === "^") {
            this.next();
            const exponent = this.parseUnary();
            return { kind: "binary", op: "^", left: base, right: exponent };
          }
          return base;
        } finally {
          this.leave();
        }
      }
      parsePrimary() {
        const token = this.next();
        if (token.type === "number") {
          const value = Number(token.text);
          if (!Number.isFinite(value)) throw new ExpressionError(`\u6570\u5B57\u65E0\u6548\uFF1A${token.text}`);
          return { kind: "number", value };
        }
        if (token.type === "lparen") {
          const inner2 = this.parseAdditive();
          this.expect("rparen", "\u53F3\u62EC\u53F7");
          return inner2;
        }
        if (token.type === "name") {
          const name2 = token.text;
          if (this.peek().type === "lparen") {
            this.next();
            const args = [];
            if (this.peek().type !== "rparen") {
              for (; ; ) {
                args.push(this.parseAdditive());
                if (this.peek().type === "comma") {
                  this.next();
                  continue;
                }
                break;
              }
            }
            this.expect("rparen", "\u51FD\u6570\u8C03\u7528\u7684\u53F3\u62EC\u53F7");
            return this.makeCall(name2, args);
          }
          if (Object.hasOwn(CONSTANTS, name2)) return { kind: "number", value: CONSTANTS[name2] };
          if (this.variables !== void 0 && !this.variables.has(name2)) {
            throw new ExpressionError(`\u8868\u8FBE\u5F0F\u4F7F\u7528\u4E86\u672A\u58F0\u660E\u7684\u53D8\u91CF\u300C${name2}\u300D`);
          }
          return { kind: "variable", name: name2 };
        }
        if (token.type === "op") throw new ExpressionError(`\u8868\u8FBE\u5F0F\u8BED\u6CD5\u9519\u8BEF\uFF1A\u8FD0\u7B97\u7B26\u300C${token.text}\u300D\u7F3A\u5C11\u64CD\u4F5C\u6570`);
        throw new ExpressionError("\u8868\u8FBE\u5F0F\u4E0D\u5B8C\u6574");
      }
      makeCall(name2, args) {
        if (Object.hasOwn(UNARY_FUNCTIONS, name2)) {
          if (args.length !== 1) throw new ExpressionError(`\u51FD\u6570 ${name2} \u9700\u8981 1 \u4E2A\u53C2\u6570\uFF0C\u5B9E\u9645 ${args.length} \u4E2A`);
          return { kind: "call", name: name2, args };
        }
        if (BINARY_FUNCTIONS.includes(name2)) {
          const minimum = name2 === "pow" || name2 === "atan2" ? 2 : MIN_MAX_LENGTH;
          const exact = name2 === "pow" || name2 === "atan2" ? 2 : void 0;
          if (exact !== void 0 && args.length !== exact) throw new ExpressionError(`\u51FD\u6570 ${name2} \u9700\u8981 ${exact} \u4E2A\u53C2\u6570`);
          if (exact === void 0 && args.length < minimum) throw new ExpressionError(`\u51FD\u6570 ${name2} \u81F3\u5C11\u9700\u8981 ${minimum} \u4E2A\u53C2\u6570`);
          return { kind: "call", name: name2, args };
        }
        throw new ExpressionError(`\u4E0D\u652F\u6301\u7684\u51FD\u6570\u300C${name2}\u300D`);
      }
    };
    function evaluateAst(ast, values) {
      switch (ast.kind) {
        case "number":
          return ast.value;
        case "variable": {
          if (!Object.hasOwn(values, ast.name)) throw new ExpressionError(`\u7F3A\u5C11\u53D8\u91CF\u300C${ast.name}\u300D\u7684\u503C`);
          const value = values[ast.name];
          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new ExpressionError(`\u53D8\u91CF\u300C${ast.name}\u300D\u4E0D\u662F\u6709\u9650\u6570\u5B57`);
          }
          return value;
        }
        case "negate":
          return -evaluateAst(ast.operand, values);
        case "binary": {
          const left = evaluateAst(ast.left, values);
          const right = evaluateAst(ast.right, values);
          if (ast.op === "+") return left + right;
          if (ast.op === "-") return left - right;
          if (ast.op === "*") return left * right;
          if (ast.op === "/") return left / right;
          if (ast.op === "%") return left % right;
          return left ** right;
        }
        case "call": {
          const name2 = ast.name;
          const args = ast.args.map((arg) => evaluateAst(arg, values));
          if (name2 === "pow") return (args[0] ?? 0) ** (args[1] ?? 0);
          if (name2 === "atan2") return Math.atan2(args[0] ?? 0, args[1] ?? 0);
          if (name2 === "min") return Math.min(...args);
          if (name2 === "max") return Math.max(...args);
          const fn = Object.hasOwn(UNARY_FUNCTIONS, name2) ? UNARY_FUNCTIONS[name2] : void 0;
          if (fn === void 0) throw new ExpressionError(`\u4E0D\u652F\u6301\u7684\u51FD\u6570\u300C${name2}\u300D`);
          return fn(args[0] ?? 0);
        }
        default:
          throw new ExpressionError("\u8868\u8FBE\u5F0F\u5185\u90E8\u9519\u8BEF");
      }
    }
    function collectVariables(ast, into) {
      switch (ast.kind) {
        case "variable":
          into.add(ast.name);
          return;
        case "negate":
          collectVariables(ast.operand, into);
          return;
        case "binary":
          collectVariables(ast.left, into);
          collectVariables(ast.right, into);
          return;
        case "call":
          for (const arg of ast.args) collectVariables(arg, into);
          return;
        default:
          return;
      }
    }
    function compileExpression(source, options = {}) {
      if (typeof source !== "string" || source.trim() === "") throw new ExpressionError("\u8868\u8FBE\u5F0F\u4E3A\u7A7A");
      if (source.length > MAX_SOURCE_LENGTH2) throw new ExpressionError(`\u8868\u8FBE\u5F0F\u8FC7\u957F\uFF08\u4E0A\u9650 ${MAX_SOURCE_LENGTH2} \u5B57\u7B26\uFF09`);
      const tokens = tokenize(source);
      const ast = new Parser2(tokens, options.variables).parse();
      const used = /* @__PURE__ */ new Set();
      collectVariables(ast, used);
      return {
        source,
        variables: [...used],
        evaluate(values) {
          const result = evaluateAst(ast, values);
          if (Number.isNaN(result)) throw new ExpressionError("\u8868\u8FBE\u5F0F\u7ED3\u679C\u4E3A NaN");
          return result;
        }
      };
    }

    // packages/teaching-core/src/render/figure.ts
    var WIDTH = 640;
    var HEIGHT = 340;
    var PADDING = { left: 48, right: 20, top: 24, bottom: 56 };
    var TEXT = "var(--dsw-alias-label-secondary, #64748b)";
    var BORDER = "var(--dsw-alias-border-l2, rgba(127,127,127,0.25))";
    var MAX_LABEL = 28;
    function shortLabel(label) {
      return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}\u2026` : label;
    }
    function mountFigure(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const width = options.width ?? WIDTH;
      const height = options.height ?? HEIGHT;
      const wrapper = createElement(document2, "div", { className: "teaching-figure" });
      wrapper.style.width = "100%";
      if (payload.title !== void 0) {
        wrapper.appendChild(createElement(document2, "div", {
          className: "teaching-figure-title",
          text: payload.title,
          styles: { fontWeight: "600", fontSize: "13px", marginBottom: "4px" }
        }));
      }
      if (payload.variant === "table") {
        wrapper.appendChild(renderTable(document2, payload));
      } else {
        const { svg, description } = renderSvg(document2, payload, width, height);
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", description);
        wrapper.appendChild(svg);
      }
      if (payload.caption !== void 0) {
        wrapper.appendChild(createElement(document2, "div", {
          className: "teaching-figure-caption",
          text: payload.caption,
          styles: { fontSize: "12px", opacity: "0.72", marginTop: "4px" }
        }));
      }
      if (payload.alt !== void 0) wrapper.setAttribute("title", payload.alt);
      container.appendChild(wrapper);
      return {
        element: wrapper,
        dispose: () => {
          clearElement(wrapper);
          wrapper.remove();
        }
      };
    }
    function renderSvg(document2, payload, width, height) {
      const svg = createSvgElement(document2, "svg", {
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: "xMidYMid meet"
      });
      svg.setAttribute("width", "100%");
      if (payload.variant === "bar-chart") return renderBarChart(document2, svg, payload, width, height);
      if (payload.variant === "scatter") return renderScatter(document2, svg, payload, width, height);
      if (payload.variant === "concept-map") return renderConceptMap(document2, svg, payload, width, height);
      return renderFlow(document2, svg, payload, width, height);
    }
    function niceDomain(values, includeZero) {
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (includeZero) {
        min = Math.min(0, min);
        max = Math.max(0, max);
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
      if (min === max) return [min - 1, max + 1];
      const pad2 = (max - min) * 0.08;
      return [min - (includeZero && min === 0 ? 0 : pad2), max + pad2];
    }
    function drawAxes(document2, svg, width, height, xTicks, yTicks) {
      const plotW = width - PADDING.left - PADDING.right;
      const plotH = height - PADDING.top - PADDING.bottom;
      svg.appendChild(createSvgElement(document2, "line", {
        x1: PADDING.left,
        y1: PADDING.top + plotH,
        x2: PADDING.left + plotW,
        y2: PADDING.top + plotH,
        stroke: TEXT,
        "stroke-width": 1
      }));
      svg.appendChild(createSvgElement(document2, "line", {
        x1: PADDING.left,
        y1: PADDING.top,
        x2: PADDING.left,
        y2: PADDING.top + plotH,
        stroke: TEXT,
        "stroke-width": 1
      }));
      for (const tick of yTicks) {
        const label = createSvgElement(document2, "text", {
          x: PADDING.left - 6,
          y: tick.y + 3,
          "text-anchor": "end",
          "font-size": 10,
          fill: TEXT
        });
        label.textContent = tick.label;
        svg.appendChild(label);
        svg.appendChild(createSvgElement(document2, "line", {
          x1: PADDING.left,
          y1: tick.y,
          x2: PADDING.left + plotW,
          y2: tick.y,
          stroke: BORDER,
          "stroke-width": 1
        }));
      }
      for (const tick of xTicks) {
        const label = createSvgElement(document2, "text", {
          x: tick.x,
          y: PADDING.top + plotH + 16,
          "text-anchor": "middle",
          "font-size": 10,
          fill: TEXT
        });
        label.textContent = tick.label;
        svg.appendChild(label);
      }
    }
    function renderBarChart(document2, svg, payload, width, height) {
      const data = payload.data ?? [];
      const [yMin, yMax] = niceDomain(data.map((point) => point.y), true);
      const plotW = width - PADDING.left - PADDING.right;
      const plotH = height - PADDING.top - PADDING.bottom;
      const projectY = (value) => PADDING.top + (yMax - value) / (yMax - yMin) * plotH;
      const groups = [...new Set(data.map((point) => point.group ?? ""))];
      const slot = data.length === 0 ? plotW : plotW / data.length;
      const barWidth = Math.max(4, Math.min(48, slot * 0.62));
      drawAxes(
        document2,
        svg,
        width,
        height,
        data.map((point, index) => ({ x: PADDING.left + slot * index + slot / 2, label: shortLabel(point.label) })),
        Array.from({ length: 5 }, (_, index) => {
          const value = yMin + (yMax - yMin) * index / 4;
          return { y: projectY(value), label: formatNumber(value, 2) };
        })
      );
      data.forEach((point, index) => {
        const cx = PADDING.left + slot * index + slot / 2;
        const y = projectY(point.y);
        const top = Math.min(y, projectY(0));
        const barHeight = Math.abs(projectY(0) - y);
        const rect = createSvgElement(document2, "rect", {
          x: cx - barWidth / 2,
          y: top,
          width: barWidth,
          height: barHeight,
          fill: plotColor(void 0, groups.indexOf(point.group ?? "")),
          rx: 2
        });
        rect.setAttribute("data-label", point.label);
        svg.appendChild(rect);
        const valueLabel = createSvgElement(document2, "text", {
          x: cx,
          y: point.y >= 0 ? top - 4 : top + barHeight + 12,
          "text-anchor": "middle",
          "font-size": 10,
          fill: TEXT
        });
        valueLabel.textContent = formatNumber(point.y, 3);
        svg.appendChild(valueLabel);
      });
      return { svg, description: `\u67F1\u72B6\u56FE\uFF1A${data.map((point) => `${point.label}=${formatNumber(point.y, 3)}`).join("\uFF0C")}` };
    }
    function renderScatter(document2, svg, payload, width, height) {
      const data = payload.data ?? [];
      const points = data.map((point, index) => ({ x: point.x ?? index, y: point.y, group: point.group ?? "", label: point.label }));
      const [xMin, xMax] = niceDomain(points.map((point) => point.x), false);
      const [yMin, yMax] = niceDomain(points.map((point) => point.y), false);
      const plotW = width - PADDING.left - PADDING.right;
      const plotH = height - PADDING.top - PADDING.bottom;
      const projectX = (value) => PADDING.left + (value - xMin) / (xMax - xMin) * plotW;
      const projectY = (value) => PADDING.top + (yMax - value) / (yMax - yMin) * plotH;
      drawAxes(
        document2,
        svg,
        width,
        height,
        Array.from({ length: 5 }, (_, index) => {
          const value = xMin + (xMax - xMin) * index / 4;
          return { x: projectX(value), label: formatNumber(value, 2) };
        }),
        Array.from({ length: 5 }, (_, index) => {
          const value = yMin + (yMax - yMin) * index / 4;
          return { y: projectY(value), label: formatNumber(value, 2) };
        })
      );
      const groups = [...new Set(points.map((point) => point.group))];
      points.forEach((point) => {
        const dot = createSvgElement(document2, "circle", {
          cx: projectX(point.x),
          cy: projectY(point.y),
          r: 4,
          fill: plotColor(void 0, groups.indexOf(point.group)),
          opacity: 0.9
        });
        dot.setAttribute("data-label", point.label);
        svg.appendChild(dot);
      });
      return {
        svg,
        description: `\u6563\u70B9\u56FE\uFF1A${points.map((point) => `(${formatNumber(point.x, 2)}, ${formatNumber(point.y, 2)})`).join("\uFF0C")}`
      };
    }
    function renderConceptMap(document2, svg, payload, width, height) {
      const nodes = payload.nodes ?? [];
      const edges = payload.edges ?? [];
      const centerX = width / 2;
      const centerY = height / 2;
      const radiusX = Math.max(60, (width - 180) / 2);
      const radiusY = Math.max(40, (height - 110) / 2);
      const positions = /* @__PURE__ */ new Map();
      nodes.forEach((node, index) => {
        const angle = Math.PI * 2 * index / Math.max(1, nodes.length) - Math.PI / 2;
        positions.set(node.id, { x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY });
      });
      for (const edge of edges) {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (from === void 0 || to === void 0) continue;
        svg.appendChild(createSvgElement(document2, "line", {
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          stroke: BORDER,
          "stroke-width": 1.4,
          "stroke-dasharray": edge.label === void 0 ? "5 3" : ""
        }));
        if (edge.label !== void 0) {
          const label = createSvgElement(document2, "text", {
            x: (from.x + to.x) / 2,
            y: (from.y + to.y) / 2 - 4,
            "text-anchor": "middle",
            "font-size": 9,
            fill: TEXT
          });
          label.textContent = edge.label;
          svg.appendChild(label);
        }
      }
      nodes.forEach((node, index) => {
        const position = positions.get(node.id);
        if (position === void 0) return;
        const boxWidth = Math.min(180, Math.max(72, node.label.length * 13 + 20));
        svg.appendChild(createSvgElement(document2, "rect", {
          x: position.x - boxWidth / 2,
          y: position.y - 14,
          width: boxWidth,
          height: 28,
          rx: 8,
          fill: plotColor(void 0, index),
          opacity: 0.16
        }));
        const label = createSvgElement(document2, "text", {
          x: position.x,
          y: position.y + 4,
          "text-anchor": "middle",
          "font-size": 11,
          fill: TEXT
        });
        label.textContent = shortLabel(node.label);
        label.setAttribute("data-node-id", node.id);
        if (node.detail !== void 0) label.setAttribute("title", node.detail);
        svg.appendChild(label);
      });
      return { svg, description: `\u6982\u5FF5\u56FE\uFF1A${nodes.map((node) => node.label).join("\u3001")}` };
    }
    function renderFlow(document2, svg, payload, width, height) {
      const nodes = payload.nodes ?? [];
      const edges = payload.edges ?? [];
      const incoming = /* @__PURE__ */ new Map();
      for (const node of nodes) incoming.set(node.id, []);
      for (const edge of edges) incoming.get(edge.to)?.push(edge.from);
      const depthCache = /* @__PURE__ */ new Map();
      const depthOf = (id, seen) => {
        const cached = depthCache.get(id);
        if (cached !== void 0) return cached;
        if (seen.has(id)) return 0;
        seen.add(id);
        const parents = incoming.get(id) ?? [];
        const depth = parents.length === 0 ? 0 : 1 + Math.max(...parents.map((parent) => depthOf(parent, seen)));
        depthCache.set(id, depth);
        return depth;
      };
      for (const node of nodes) depthOf(node.id, /* @__PURE__ */ new Set());
      const rows = /* @__PURE__ */ new Map();
      for (const node of nodes) {
        const depth = depthCache.get(node.id) ?? 0;
        rows.set(depth, [...rows.get(depth) ?? [], node]);
      }
      const rowCount = Math.max(1, rows.size);
      const rowHeight = (height - 50) / rowCount;
      const positions = /* @__PURE__ */ new Map();
      for (const [depth, rowNodes] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
        const slot = width / (rowNodes.length + 1);
        rowNodes.forEach((node, index) => {
          positions.set(node.id, { x: slot * (index + 1), y: 30 + rowHeight * depth + rowHeight / 2 });
        });
      }
      for (const edge of edges) {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (from === void 0 || to === void 0) continue;
        svg.appendChild(createSvgElement(document2, "line", {
          x1: from.x,
          y1: from.y + 14,
          x2: to.x,
          y2: to.y - 14,
          stroke: TEXT,
          "stroke-width": 1.2
        }));
        if (edge.label !== void 0) {
          const label = createSvgElement(document2, "text", {
            x: (from.x + to.x) / 2 + 4,
            y: (from.y + to.y) / 2,
            "font-size": 9,
            fill: TEXT
          });
          label.textContent = edge.label;
          svg.appendChild(label);
        }
      }
      nodes.forEach((node) => {
        const position = positions.get(node.id);
        if (position === void 0) return;
        const boxWidth = Math.min(190, Math.max(84, node.label.length * 13 + 24));
        svg.appendChild(createSvgElement(document2, "rect", {
          x: position.x - boxWidth / 2,
          y: position.y - 16,
          width: boxWidth,
          height: 32,
          rx: 8,
          fill: "var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.10))",
          stroke: BORDER
        }));
        const label = createSvgElement(document2, "text", {
          x: position.x,
          y: position.y + 4,
          "text-anchor": "middle",
          "font-size": 11,
          fill: TEXT
        });
        label.textContent = shortLabel(node.label);
        if (node.detail !== void 0) label.setAttribute("title", node.detail);
        svg.appendChild(label);
      });
      return { svg, description: `\u6D41\u7A0B\u56FE\uFF1A${nodes.map((node) => node.label).join(" \u2192 ")}` };
    }
    function renderTable(document2, payload) {
      const table = createElement(document2, "table", {
        className: "teaching-figure-table",
        styles: { borderCollapse: "collapse", fontSize: "12px", width: "100%" }
      });
      const header = createElement(document2, "thead");
      const headerRow = createElement(document2, "tr");
      const hasGroups = (payload.data ?? []).some((point) => point.group !== void 0);
      const columns = payload.variant === "table" ? ["\u9879\u76EE", "\u6570\u503C", ...hasGroups ? ["\u5206\u7EC4"] : []] : ["\u9879\u76EE", "\u6570\u503C"];
      for (const column of columns) {
        const cell = createElement(document2, "th", {
          text: column,
          styles: { textAlign: "left", padding: "4px 8px", borderBottom: `1px solid ${BORDER}` }
        });
        headerRow.appendChild(cell);
      }
      header.appendChild(headerRow);
      table.appendChild(header);
      const body = createElement(document2, "tbody");
      for (const point of payload.data ?? []) {
        const row = createElement(document2, "tr");
        const values = [point.label, formatNumber(point.y, 4), ...hasGroups ? [point.group ?? ""] : []];
        for (const value of values) {
          row.appendChild(createElement(document2, "td", {
            text: value,
            styles: { padding: "4px 8px", borderBottom: `1px solid ${BORDER}` }
          }));
        }
        body.appendChild(row);
      }
      table.appendChild(body);
      return table;
    }

    // packages/teaching-core/src/render/graph.ts
    var DEFAULT_WIDTH = 640;
    var DEFAULT_HEIGHT = 380;
    var SAMPLES = 480;
    var PADDING2 = { left: 52, right: 18, top: 16, bottom: 38 };
    function defaultRequestFrame(callback) {
      const raf = globalThis.requestAnimationFrame;
      if (raf !== void 0) return raf(callback);
      return setTimeout(() => callback(Date.now()), 16);
    }
    function defaultCancelFrame(handle) {
      const caf = globalThis.cancelAnimationFrame;
      if (caf !== void 0) caf(handle);
      else clearTimeout(handle);
    }
    function buildSeriesPath(expression, baseValues, xRange, projectX, projectY) {
      const [from, to] = xRange;
      const step = (to - from) / SAMPLES;
      const parts = [];
      let penDown = false;
      let previousY = Number.NaN;
      for (let index = 0; index <= SAMPLES; index += 1) {
        const x = from + step * index;
        let y;
        try {
          y = expression.evaluate({ ...baseValues, x });
        } catch {
          penDown = false;
          previousY = Number.NaN;
          continue;
        }
        if (!Number.isFinite(y)) {
          penDown = false;
          previousY = Number.NaN;
          continue;
        }
        if (penDown && Number.isFinite(previousY) && Math.abs(y - previousY) > 1e6) penDown = false;
        parts.push(`${penDown ? "L" : "M"}${projectX(x).toFixed(2)},${projectY(y).toFixed(2)}`);
        penDown = true;
        previousY = y;
      }
      return parts.join(" ");
    }
    function mountGraph(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const width = options.width ?? DEFAULT_WIDTH;
      const height = options.height ?? DEFAULT_HEIGHT;
      const requestFrame = options.requestFrame ?? defaultRequestFrame;
      const cancelFrame = options.cancelFrame ?? defaultCancelFrame;
      const disposers = [];
      const params = {};
      for (const param of payload.params ?? []) params[param.name] = param.value;
      for (const [name2, value] of Object.entries(options.params ?? {})) {
        if (Number.isFinite(value)) params[name2] = value;
      }
      const variables = ["x", ...(payload.params ?? []).map((param) => param.name)];
      const compiled = payload.series.map((series) => {
        try {
          return compileExpression(series.expr, { variables });
        } catch (error) {
          return error instanceof ExpressionError ? error : new ExpressionError(String(error));
        }
      });
      const [xFrom, xTo] = normaliseRange(payload.xRange, -10, 10);
      const [yFrom, yTo] = normaliseRange(payload.yRange, -10, 10);
      const wrapper = createElement(document2, "div", { className: "teaching-graph" });
      const canvas = createSvgElement(document2, "svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": payload.title ?? "\u4EA4\u4E92\u56FE",
        preserveAspectRatio: "xMidYMid meet"
      });
      wrapper.style.width = "100%";
      canvas.setAttribute("width", "100%");
      canvas.style.maxWidth = `${width}px`;
      const plotWidth = width - PADDING2.left - PADDING2.right;
      const plotHeight = height - PADDING2.top - PADDING2.bottom;
      const projectX = (x) => PADDING2.left + (x - xFrom) / (xTo - xFrom) * plotWidth;
      const projectY = (y) => PADDING2.top + (yTo - y) / (yTo - yFrom) * plotHeight;
      const textFill = "var(--dsw-alias-label-secondary, #64748b)";
      const gridStroke = "var(--dsw-alias-border-l2, rgba(127, 127, 127, 0.22))";
      const drawFrame = () => {
        for (let index = 0; index <= 4; index += 1) {
          const x = xFrom + (xTo - xFrom) * index / 4;
          const y = yFrom + (yTo - yFrom) * index / 4;
          canvas.appendChild(createSvgElement(document2, "line", {
            x1: projectX(x),
            y1: PADDING2.top,
            x2: projectX(x),
            y2: PADDING2.top + plotHeight,
            stroke: gridStroke,
            "stroke-width": 1
          }));
          canvas.appendChild(createSvgElement(document2, "line", {
            x1: PADDING2.left,
            y1: projectY(y),
            x2: PADDING2.left + plotWidth,
            y2: projectY(y),
            stroke: gridStroke,
            "stroke-width": 1
          }));
          const xLabel = createSvgElement(document2, "text", {
            x: projectX(x),
            y: PADDING2.top + plotHeight + 18,
            "text-anchor": "middle",
            "font-size": 10,
            fill: textFill
          });
          xLabel.textContent = formatNumber(x, 2);
          canvas.appendChild(xLabel);
          const yLabel = createSvgElement(document2, "text", {
            x: PADDING2.left - 8,
            y: projectY(y) + 3,
            "text-anchor": "end",
            "font-size": 10,
            fill: textFill
          });
          yLabel.textContent = formatNumber(y, 2);
          canvas.appendChild(yLabel);
        }
        if (payload.xLabel !== void 0) {
          const label = createSvgElement(document2, "text", {
            x: PADDING2.left + plotWidth,
            y: height - 6,
            "text-anchor": "end",
            "font-size": 11,
            fill: textFill
          });
          label.textContent = payload.xLabel;
          canvas.appendChild(label);
        }
        if (payload.yLabel !== void 0) {
          const label = createSvgElement(document2, "text", {
            x: 8,
            y: PADDING2.top - 4,
            "text-anchor": "start",
            "font-size": 11,
            fill: textFill
          });
          label.textContent = payload.yLabel;
          canvas.appendChild(label);
        }
      };
      let seriesPaths = [];
      let errorNote;
      const drawSeries = () => {
        for (const path2 of seriesPaths) path2.remove();
        seriesPaths = [];
        errorNote?.remove();
        errorNote = void 0;
        payload.series.forEach((series, index) => {
          const expression = compiled[index];
          if (expression === void 0) return;
          const path2 = createSvgElement(document2, "path", {
            d: "",
            fill: "none",
            stroke: plotColor(series.color, index),
            "stroke-width": 2,
            "vector-effect": "non-scaling-stroke",
            ...series.dashed === true ? { "stroke-dasharray": "6 4" } : {}
          });
          if (expression instanceof ExpressionError) {
            path2.setAttribute("d", "");
            seriesPaths.push(path2);
            canvas.appendChild(path2);
            if (errorNote === void 0) {
              errorNote = createElement(document2, "div", {
                className: "teaching-graph-error",
                text: `\u516C\u5F0F\u300C${series.label}\u300D\u65E0\u6CD5\u6C42\u503C\uFF1A${expression.message}`,
                styles: { color: "var(--dsw-alias-state-warn-primary, #b45309)", fontSize: "12px", marginTop: "4px" }
              });
              wrapper.appendChild(errorNote);
            }
            return;
          }
          const pathData = buildSeriesPath(expression, params, [xFrom, xTo], projectX, projectY);
          path2.setAttribute("d", pathData);
          seriesPaths.push(path2);
          canvas.appendChild(path2);
        });
        for (const marker of payload.markers ?? []) {
          if (!Number.isFinite(marker.x) || !Number.isFinite(marker.y)) continue;
          const cx = projectX(marker.x);
          const cy = projectY(marker.y);
          canvas.appendChild(createSvgElement(document2, "circle", { cx, cy, r: 3.5, fill: PLOT_COLORS.orange ?? "#f59e0b" }));
          if (marker.label !== void 0) {
            const label = createSvgElement(document2, "text", { x: cx + 6, y: cy - 6, "font-size": 11, fill: textFill });
            label.textContent = marker.label;
            canvas.appendChild(label);
          }
        }
      };
      drawFrame();
      drawSeries();
      wrapper.appendChild(canvas);
      if (payload.series.length > 0) {
        const legend = createElement(document2, "div", {
          className: "teaching-graph-legend",
          styles: { display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px", margin: "4px 0 0" }
        });
        payload.series.forEach((series, index) => {
          const item = createElement(document2, "span", { styles: { display: "inline-flex", alignItems: "center", gap: "5px" } });
          item.appendChild(createElement(document2, "span", {
            styles: {
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: plotColor(series.color, index)
            }
          }));
          item.appendChild(document2.createTextNode(series.label));
          legend.appendChild(item);
        });
        wrapper.appendChild(legend);
      }
      const sliderValues = /* @__PURE__ */ new Map();
      if ((payload.params ?? []).length > 0) {
        const controls = createElement(document2, "div", {
          className: "teaching-graph-params",
          styles: { display: "grid", gap: "6px", marginTop: "8px" }
        });
        for (const param of payload.params ?? []) {
          const row = createElement(document2, "label", {
            className: "teaching-graph-param",
            styles: { display: "grid", gridTemplateColumns: "120px 1fr 64px", alignItems: "center", gap: "8px", fontSize: "12px" },
            ariaLabel: `\u53C2\u6570 ${param.label}`
          });
          row.appendChild(createElement(document2, "span", { text: param.label }));
          const slider = createElement(document2, "input", {
            attrs: {
              type: "range",
              min: String(param.min),
              max: String(param.max),
              step: String(param.step),
              value: String(params[param.name] ?? param.value)
            },
            ariaLabel: `${param.label} \u6ED1\u6746`
          });
          const readout = createElement(document2, "span", {
            text: `${formatNumber(params[param.name] ?? param.value, 3)}${param.unit ?? ""}`,
            styles: { textAlign: "right", fontVariantNumeric: "tabular-nums" }
          });
          const update = () => {
            const next = Number(slider.value);
            if (!Number.isFinite(next)) return;
            params[param.name] = clampToParam(next, param.min, param.max);
            readout.textContent = `${formatNumber(params[param.name] ?? param.value, 3)}${param.unit ?? ""}`;
            drawSeries();
            options.onChange?.({ ...params }, "slider");
          };
          disposers.push(on(slider, "input", update));
          row.appendChild(slider);
          row.appendChild(readout);
          controls.appendChild(row);
          sliderValues.set(param.name, readout);
        }
        wrapper.appendChild(controls);
      }
      const animation = payload.animation;
      let playing = false;
      let frameHandle;
      let animationStart;
      let animationPrevious = animation?.from;
      const persistParams = () => {
        options.onChange?.({ ...params }, "animation");
      };
      const applyParamsToSliders = () => {
        for (const param of payload.params ?? []) {
          const readout = sliderValues.get(param.name);
          if (readout === void 0) continue;
          readout.textContent = `${formatNumber(params[param.name] ?? param.value, 3)}${param.unit ?? ""}`;
        }
      };
      const tick = (now) => {
        if (!playing || animation === void 0) return;
        if (animationStart === void 0) animationStart = now;
        const elapsed = now - animationStart;
        const duration = Math.max(1, animation.durationMs);
        const progress = elapsed / duration;
        const cycle = animation.loop === true ? progress % 1 : Math.min(1, progress);
        const value = animation.from + (animation.to - animation.from) * cycle;
        params[animation.param] = value;
        applyParamsToSliders();
        drawSeries();
        animationPrevious = value;
        if (!animation.loop && cycle >= 1) {
          playing = false;
          scheduleNextFrame();
          syncPlayButton();
          persistParams();
          return;
        }
        persistParams();
        scheduleNextFrame();
      };
      const scheduleNextFrame = () => {
        if (!playing) return;
        frameHandle = requestFrame((timeMs) => {
          frameHandle = void 0;
          tick(timeMs);
        });
      };
      const stopFrames = () => {
        if (frameHandle !== void 0) cancelFrame(frameHandle);
        frameHandle = void 0;
        animationStart = void 0;
      };
      let playButton;
      const syncPlayButton = () => {
        if (playButton === void 0) return;
        playButton.textContent = playing ? "\u6682\u505C\u52A8\u753B" : "\u64AD\u653E\u52A8\u753B";
        playButton.setAttribute("aria-label", playing ? "\u6682\u505C\u52A8\u753B" : "\u64AD\u653E\u52A8\u753B");
      };
      if (animation !== void 0) {
        const controls = createElement(document2, "div", {
          className: "teaching-graph-animation",
          styles: { display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", fontSize: "12px" }
        });
        playButton = createElement(document2, "button", {
          text: "\u64AD\u653E\u52A8\u753B",
          ariaLabel: "\u64AD\u653E\u52A8\u753B",
          attrs: { type: "button" },
          styles: { fontSize: "12px", padding: "3px 10px", cursor: "pointer" }
        });
        disposers.push(on(playButton, "click", () => {
          if (playing) {
            playing = false;
            stopFrames();
          } else {
            playing = true;
            animationStart = void 0;
            scheduleNextFrame();
          }
          syncPlayButton();
        }));
        controls.appendChild(playButton);
        controls.appendChild(createElement(document2, "span", {
          text: `${animation.param}\uFF1A${formatNumber(animation.from, 3)} \u2192 ${formatNumber(animation.to, 3)}\uFF08${Math.round(animation.durationMs / 100) / 10}s${animation.loop === true ? "\uFF0C\u5FAA\u73AF" : ""}\uFF09`,
          styles: { opacity: "0.75" }
        }));
        wrapper.appendChild(controls);
      }
      if (payload.hint !== void 0) {
        wrapper.appendChild(createElement(document2, "p", {
          className: "teaching-graph-hint",
          text: payload.hint,
          styles: { fontSize: "12px", opacity: "0.75", margin: "6px 0 0" }
        }));
      }
      container.appendChild(wrapper);
      const play = () => {
        if (animation === void 0 || playing) return;
        playing = true;
        animationStart = void 0;
        scheduleNextFrame();
        syncPlayButton();
      };
      const pause = () => {
        playing = false;
        stopFrames();
        syncPlayButton();
      };
      return {
        element: wrapper,
        getParams: () => ({ ...params }),
        setParams: (next) => {
          for (const [name2, value] of Object.entries(next)) {
            if (Number.isFinite(value)) params[name2] = value;
          }
          applyParamsToSliders();
          drawSeries();
        },
        isPlaying: () => playing,
        play,
        pause,
        dispose: () => {
          playing = false;
          stopFrames();
          for (const dispose of disposers) dispose();
          disposers.length = 0;
          clearElement(wrapper);
          wrapper.remove();
        }
      };
    }
    function clampToParam(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }
    function normaliseRange(range, fallbackFrom, fallbackTo) {
      const from = Number(range[0]);
      const to = Number(range[1]);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return [fallbackFrom, fallbackTo];
      return from < to ? [from, to] : [to, from];
    }

    // packages/teaching-core/src/render/quiz.ts
    function mountQuiz(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const disposers = [];
      const selected = new Set(options.selectedOptionIds ?? []);
      let revealed = options.answerRevealed === true;
      let hintShown = options.hintRevealed === true;
      const wrapper = createElement(document2, "div", { className: "teaching-quiz" });
      const question = createElement(document2, "div", {
        className: "teaching-quiz-question",
        styles: { fontWeight: "600", fontSize: "13px", marginBottom: "6px" }
      });
      question.appendChild(document2.createTextNode(payload.question));
      if (payload.markdown !== void 0) {
        appendMarkdownBlocks(question, document2, parseMarkdown(payload.markdown), options);
      }
      wrapper.appendChild(question);
      wrapper.appendChild(createElement(document2, "div", {
        text: payload.multiple === true ? "\u591A\u9009\uFF08\u81F3\u5C11\u9009\u4E00\u9879\uFF09" : "\u5355\u9009",
        styles: { fontSize: "11px", opacity: "0.6", marginBottom: "4px" }
      }));
      const optionList = createElement(document2, "div", {
        className: "teaching-quiz-options",
        attrs: { role: "group", "aria-label": "\u9009\u9879" },
        styles: { display: "grid", gap: "6px" }
      });
      const rowById = /* @__PURE__ */ new Map();
      const inputById = /* @__PURE__ */ new Map();
      const feedbackSuffix = /* @__PURE__ */ new Map();
      for (const option of payload.options) {
        const row = createElement(document2, "label", {
          className: "teaching-quiz-option",
          styles: {
            display: "flex",
            gap: "8px",
            alignItems: "flex-start",
            padding: "6px 8px",
            border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25))",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "12px"
          }
        });
        const input = createElement(document2, "input", {
          attrs: {
            type: payload.multiple === true ? "checkbox" : "radio",
            name: "teaching-quiz-option",
            value: option.id
          },
          ariaLabel: option.label
        });
        input.checked = selected.has(option.id);
        disposers.push(on(input, "change", () => {
          if (payload.multiple === true) {
            if (input.checked) selected.add(option.id);
            else selected.delete(option.id);
          } else {
            selected.clear();
            selected.add(option.id);
          }
          syncSelections();
        }));
        const label = createElement(document2, "span", { text: option.label });
        const suffix = createElement(document2, "span", { styles: { marginLeft: "auto", fontSize: "11px" } });
        row.appendChild(input);
        row.appendChild(label);
        row.appendChild(suffix);
        optionList.appendChild(row);
        rowById.set(option.id, row);
        inputById.set(option.id, input);
        feedbackSuffix.set(option.id, suffix);
      }
      wrapper.appendChild(optionList);
      const syncSelections = () => {
        for (const option of payload.options) {
          const row = rowById.get(option.id);
          const input = inputById.get(option.id);
          const suffix = feedbackSuffix.get(option.id);
          if (row === void 0 || input === void 0 || suffix === void 0) continue;
          input.checked = selected.has(option.id);
          row.style.background = selected.has(option.id) ? "var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.12))" : "";
          if (!revealed) {
            row.style.borderColor = "";
            suffix.textContent = "";
            continue;
          }
          const correct = payload.correctOptionIds.includes(option.id);
          const chosen = selected.has(option.id);
          row.style.borderColor = correct ? "var(--dsw-alias-state-success-primary, #16a34a)" : chosen ? "var(--dsw-alias-state-error-primary, #dc2626)" : "";
          suffix.textContent = correct ? "\u2713 \u6B63\u786E\u9009\u9879" : chosen ? "\u2717 \u4F60\u7684\u9009\u62E9\u4E0D\u6B63\u786E" : "";
        }
      };
      const feedback = createElement(document2, "div", {
        className: "teaching-quiz-feedback",
        styles: { marginTop: "8px", fontSize: "12px" }
      });
      const explanation = createElement(document2, "div", {
        className: "teaching-quiz-explanation",
        styles: { marginTop: "6px", fontSize: "12px" }
      });
      const controls = createElement(document2, "div", {
        styles: { display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" }
      });
      const submitButton = createElement(document2, "button", {
        text: "\u63D0\u4EA4\u7B54\u6848",
        ariaLabel: "\u63D0\u4EA4\u7B54\u6848",
        attrs: { type: "button" },
        styles: { fontSize: "12px", padding: "4px 14px", cursor: "pointer" }
      });
      let hintButton;
      const hintBox = createElement(document2, "div", {
        className: "teaching-quiz-hint",
        styles: { marginTop: "8px", fontSize: "12px", color: "var(--dsw-alias-state-warn-primary, #b45309)", display: "none" }
      });
      const showHint = () => {
        if (payload.hint === void 0 || hintShown) return;
        hintShown = true;
        hintBox.textContent = `\u63D0\u793A\uFF1A${payload.hint}`;
        hintBox.style.display = "";
        if (hintButton !== void 0) hintButton.style.display = "none";
        options.onHelpExposed?.({ level: 1, answer: payload.hint });
      };
      if (payload.hint !== void 0) {
        hintButton = createElement(document2, "button", {
          text: "\u7ED9\u63D0\u793A",
          ariaLabel: "\u663E\u793A\u63D0\u793A",
          attrs: { type: "button" },
          styles: { fontSize: "12px", padding: "4px 12px", cursor: "pointer" }
        });
        disposers.push(on(hintButton, "click", showHint));
        controls.appendChild(hintButton);
      }
      controls.appendChild(submitButton);
      const correctLabels = () => payload.correctOptionIds.map((id) => payload.options.find((option) => option.id === id)?.label ?? id);
      let revealButton;
      const doReveal = () => {
        if (revealed) return;
        revealed = true;
        syncSelections();
        feedback.textContent = `\u6B63\u786E\u7B54\u6848\uFF1A${correctLabels().join("\u3001")}`;
        if (payload.explanation !== void 0) {
          appendMarkdownBlocks(explanation, document2, parseMarkdown(payload.explanation), options);
        }
        if (revealButton !== void 0) revealButton.style.display = "none";
        options.onHelpExposed?.({ level: "full-answer", answer: correctLabels().join("\u3001") });
      };
      if (payload.correctOptionIds.length > 0) {
        revealButton = createElement(document2, "button", {
          text: "\u770B\u5B8C\u6574\u7B54\u6848",
          ariaLabel: "\u67E5\u770B\u5B8C\u6574\u7B54\u6848",
          attrs: { type: "button" },
          styles: { fontSize: "12px", padding: "4px 12px", cursor: "pointer" }
        });
        disposers.push(on(revealButton, "click", doReveal));
        controls.appendChild(revealButton);
      }
      disposers.push(on(submitButton, "click", () => {
        if (selected.size === 0) {
          feedback.textContent = "\u8BF7\u5148\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u9009\u9879\u3002";
          return;
        }
        feedback.textContent = "\u5DF2\u63D0\u4EA4\uFF1B\u7B49\u5F85\u6559\u5B66\u53CD\u9988\u3002";
        void options.onSubmit?.([...selected]);
      }));
      wrapper.appendChild(controls);
      wrapper.appendChild(hintBox);
      wrapper.appendChild(feedback);
      wrapper.appendChild(explanation);
      if (hintShown) showHint();
      if (revealed) {
        revealed = false;
        doReveal();
      }
      container.appendChild(wrapper);
      return {
        element: wrapper,
        getSelected: () => [...selected],
        revealAnswer: doReveal,
        dispose: () => {
          for (const dispose of disposers) dispose();
          disposers.length = 0;
          wrapper.remove();
        }
      };
    }

    // packages/teaching-core/src/render/tasks.ts
    function mountExplanation(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const wrapper = createElement(document2, "div", { className: "teaching-explanation" });
      if (payload.title !== void 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: payload.title,
          styles: { fontWeight: "600", fontSize: "13px", marginBottom: "4px" }
        }));
      }
      appendMarkdownBlocks(wrapper, document2, parseMarkdown(payload.markdown), options);
      if ((payload.keyPoints ?? []).length > 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: "\u5173\u952E\u70B9",
          styles: { fontWeight: "600", fontSize: "12px", marginTop: "8px" }
        }));
        const list = createElement(document2, "ul", { styles: { margin: "2px 0", paddingLeft: "18px", fontSize: "12px" } });
        for (const point of payload.keyPoints ?? []) list.appendChild(createElement(document2, "li", { text: point }));
        wrapper.appendChild(list);
      }
      if ((payload.caveats ?? []).length > 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: "\u9002\u7528\u6761\u4EF6\u4E0E\u6CE8\u610F",
          styles: { fontWeight: "600", fontSize: "12px", marginTop: "8px" }
        }));
        const list = createElement(document2, "ul", {
          styles: { margin: "2px 0", paddingLeft: "18px", fontSize: "12px", color: "var(--dsw-alias-state-warn-primary, #b45309)" }
        });
        for (const caveat of payload.caveats ?? []) list.appendChild(createElement(document2, "li", { text: caveat }));
        wrapper.appendChild(list);
      }
      container.appendChild(wrapper);
      return { element: wrapper, dispose: () => {
        clearElement(wrapper);
        wrapper.remove();
      } };
    }
    function mountReadingTask(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const wrapper = createElement(document2, "div", { className: "teaching-reading-task" });
      appendMarkdownBlocks(wrapper, document2, parseMarkdown(payload.instructions), options);
      if (payload.minMinutes !== void 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: `\u5EFA\u8BAE\u9605\u8BFB\u65F6\u95F4\uFF1A\u7EA6 ${payload.minMinutes} \u5206\u949F`,
          styles: { fontSize: "12px", opacity: "0.7", marginTop: "4px" }
        }));
      }
      appendAnchors(wrapper, document2, payload.anchors, options);
      if (payload.questions.length > 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: "\u9605\u8BFB\u65F6\u601D\u8003",
          styles: { fontWeight: "600", fontSize: "12px", marginTop: "8px" }
        }));
        const list = createElement(document2, "ol", { styles: { margin: "2px 0", paddingLeft: "20px", fontSize: "12px" } });
        for (const question of payload.questions) list.appendChild(createElement(document2, "li", { text: question }));
        wrapper.appendChild(list);
      }
      container.appendChild(wrapper);
      return { element: wrapper, dispose: () => {
        clearElement(wrapper);
        wrapper.remove();
      } };
    }
    function mountProofTask(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const wrapper = createElement(document2, "div", { className: "teaching-proof-task" });
      wrapper.appendChild(createElement(document2, "div", {
        text: `\u547D\u9898\uFF1A${payload.claim}`,
        styles: { fontWeight: "600", fontSize: "13px", margin: "0 0 4px" }
      }));
      if (payload.assumptions.length > 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: `\u5DF2\u77E5\u6761\u4EF6\uFF1A${payload.assumptions.join("\uFF1B")}`,
          styles: { fontSize: "12px", marginBottom: "4px" }
        }));
      }
      wrapper.appendChild(renderRubric(document2, payload.rubric));
      const handle = mountAnswerArea(wrapper, document2, options, {
        ...payload.hint !== void 0 ? { hint: payload.hint } : {},
        ...payload.reference !== void 0 ? { reference: payload.reference } : {}
      });
      container.appendChild(wrapper);
      return {
        element: wrapper,
        getAnswerText: handle.getAnswerText,
        revealReference: handle.revealReference,
        dispose: () => {
          handle.dispose();
          wrapper.remove();
        }
      };
    }
    function mountOpenQuestion(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const wrapper = createElement(document2, "div", { className: "teaching-open-question" });
      appendMarkdownBlocks(wrapper, document2, parseMarkdown(payload.prompt), options);
      if (payload.expectedLanguage !== void 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: `\u4F5C\u7B54\u8BED\u8A00\uFF1A${payload.expectedLanguage === "zh" ? "\u4E2D\u6587" : payload.expectedLanguage === "en" ? "\u82F1\u6587" : "\u4E2D\u82F1\u53CC\u8BED"}`,
          styles: { fontSize: "11px", opacity: "0.6", marginTop: "2px" }
        }));
      }
      wrapper.appendChild(renderRubric(document2, payload.rubric));
      const handle = mountAnswerArea(wrapper, document2, options, {
        ...payload.referencePoints !== void 0 ? { referencePoints: payload.referencePoints } : {}
      });
      container.appendChild(wrapper);
      return {
        element: wrapper,
        getAnswerText: handle.getAnswerText,
        revealReference: handle.revealReference,
        dispose: () => {
          handle.dispose();
          wrapper.remove();
        }
      };
    }
    function mountExperimentNote(container, payload, options = {}) {
      const document2 = resolveDocument(options);
      const wrapper = createElement(document2, "div", { className: "teaching-experiment-note" });
      wrapper.appendChild(createElement(document2, "div", {
        text: payload.title,
        styles: { fontWeight: "600", fontSize: "13px", marginBottom: "4px" }
      }));
      appendMarkdownBlocks(wrapper, document2, parseMarkdown(payload.markdown), options);
      const chips = [];
      if (payload.runId !== void 0) chips.push(`\u8FD0\u884C ${payload.runId}`);
      if (payload.environmentId !== void 0) chips.push(`\u73AF\u5883 ${payload.environmentId}`);
      if (chips.length > 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: chips.join(" \xB7 "),
          styles: { fontSize: "11px", opacity: "0.65", marginTop: "4px" }
        }));
      }
      if ((payload.limitations ?? []).length > 0) {
        wrapper.appendChild(createElement(document2, "div", {
          text: "\u5C40\u9650",
          styles: { fontWeight: "600", fontSize: "12px", marginTop: "8px" }
        }));
        const list = createElement(document2, "ul", { styles: { margin: "2px 0", paddingLeft: "18px", fontSize: "12px", color: "var(--dsw-alias-state-warn-primary, #b45309)" } });
        for (const limitation of payload.limitations ?? []) list.appendChild(createElement(document2, "li", { text: limitation }));
        wrapper.appendChild(list);
      }
      container.appendChild(wrapper);
      return { element: wrapper, dispose: () => {
        clearElement(wrapper);
        wrapper.remove();
      } };
    }
    function mountAnswerArea(root, document2, options, extras) {
      const disposers = [];
      const textarea = createElement(document2, "textarea", {
        className: "teaching-answer-input",
        attrs: { "aria-label": "\u4F60\u7684\u56DE\u7B54", rows: "6", placeholder: "\u5199\u4E0B\u4F60\u7684\u63A8\u7406\u8FC7\u7A0B\u6216\u7B54\u6848\uFF08\u53EF\u7528\u4E2D\u6587\uFF09" },
        styles: {
          width: "100%",
          marginTop: "8px",
          padding: "8px",
          fontSize: "12px",
          lineHeight: "1.6",
          borderRadius: "8px",
          border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3))",
          background: "var(--dsw-alias-bg-base, transparent)",
          color: "inherit",
          resize: "vertical",
          boxSizing: "border-box",
          fontFamily: "inherit"
        }
      });
      root.appendChild(textarea);
      const referenceBox = createElement(document2, "div", {
        className: "teaching-reference",
        styles: { marginTop: "6px", fontSize: "12px" }
      });
      let referenceRevealed = false;
      const revealReference = () => {
        if (referenceRevealed) return;
        referenceRevealed = true;
        clearElement(referenceBox);
        if (extras.reference !== void 0) {
          appendMarkdownBlocks(referenceBox, document2, parseMarkdown(`**\u53C2\u8003\u7B54\u6848\uFF1A** ${extras.reference}`), options);
        }
        if (extras.referencePoints !== void 0) {
          referenceBox.appendChild(createElement(document2, "div", {
            text: "\u8981\u70B9\uFF1A",
            styles: { fontWeight: "600", fontSize: "12px", marginTop: "4px" }
          }));
          const list = createElement(document2, "ul", { styles: { margin: "2px 0", paddingLeft: "18px", fontSize: "12px" } });
          for (const point of extras.referencePoints) list.appendChild(createElement(document2, "li", { text: point }));
          referenceBox.appendChild(list);
        }
        options.onHelpExposed?.({ level: "full-answer", answer: extras.reference ?? (extras.referencePoints ?? []).join("\uFF1B") });
      };
      const controls = createElement(document2, "div", {
        styles: { display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }
      });
      const submitButton = createElement(document2, "button", {
        text: "\u63D0\u4EA4\u56DE\u7B54",
        ariaLabel: "\u63D0\u4EA4\u56DE\u7B54",
        attrs: { type: "button" },
        styles: { fontSize: "12px", padding: "4px 14px", cursor: "pointer" }
      });
      const status = createElement(document2, "span", { styles: { fontSize: "12px", opacity: "0.75" } });
      disposers.push(on(submitButton, "click", () => {
        const answerText = textarea.value;
        if (answerText.trim() === "") {
          status.textContent = "\u8BF7\u5148\u5199\u4E0B\u56DE\u7B54\u3002";
          return;
        }
        status.textContent = "\u5DF2\u63D0\u4EA4\uFF1B\u7B49\u5F85\u6559\u5B66\u53CD\u9988\u3002";
        void options.onSubmitAnswer?.(answerText);
      }));
      controls.appendChild(submitButton);
      if (extras.hint !== void 0) {
        const hintButton = createElement(document2, "button", {
          text: "\u7ED9\u63D0\u793A",
          ariaLabel: "\u663E\u793A\u63D0\u793A",
          attrs: { type: "button" },
          styles: { fontSize: "12px", padding: "4px 12px", cursor: "pointer" }
        });
        const hintBox = createElement(document2, "div", {
          className: "teaching-hint",
          styles: { marginTop: "6px", fontSize: "12px", color: "var(--dsw-alias-state-warn-primary, #b45309)" }
        });
        disposers.push(on(hintButton, "click", () => {
          clearElement(hintBox);
          hintBox.appendChild(document2.createTextNode(`\u63D0\u793A\uFF1A${extras.hint ?? ""}`));
          hintButton.style.display = "none";
          options.onHelpExposed?.({ level: 1, answer: extras.hint ?? "" });
        }));
        controls.appendChild(hintButton);
        root.appendChild(controls);
        root.appendChild(hintBox);
      } else {
        root.appendChild(controls);
      }
      if (extras.reference !== void 0 || (extras.referencePoints ?? []).length > 0) {
        const revealButton = createElement(document2, "button", {
          text: "\u770B\u5B8C\u6574\u7B54\u6848",
          ariaLabel: "\u67E5\u770B\u5B8C\u6574\u7B54\u6848",
          attrs: { type: "button" },
          styles: { fontSize: "12px", padding: "4px 12px", cursor: "pointer" }
        });
        disposers.push(on(revealButton, "click", revealReference));
        controls.appendChild(revealButton);
      }
      controls.appendChild(status);
      root.appendChild(referenceBox);
      return {
        getAnswerText: () => textarea.value,
        revealReference,
        dispose: () => {
          for (const dispose of disposers) dispose();
          disposers.length = 0;
          textarea.remove();
          controls.remove();
          referenceBox.remove();
        }
      };
    }
    function renderRubric(document2, rubric) {
      const wrapper = createElement(document2, "div", { className: "teaching-rubric", styles: { marginTop: "8px" } });
      if (rubric.length === 0) return wrapper;
      wrapper.appendChild(createElement(document2, "div", {
        text: "\u8BC4\u4EF7\u6807\u51C6\uFF08\u4F1A\u4FDD\u7559\u5224\u65AD\u4F9D\u636E\u4E0E\u5C40\u9650\uFF09",
        styles: { fontWeight: "600", fontSize: "12px", marginBottom: "2px" }
      }));
      const list = createElement(document2, "ul", { styles: { margin: "2px 0", paddingLeft: "18px", fontSize: "12px" } });
      for (const criterion of rubric) {
        const detailParts = [criterion.description, criterion.observable === void 0 ? void 0 : `\u89C2\u5BDF\u70B9\uFF1A${criterion.observable}`].filter((part) => part !== void 0 && part !== "");
        list.appendChild(createElement(document2, "li", {
          text: `${criterion.label}\uFF08\u6743\u91CD ${criterion.weight}\uFF09${detailParts.length > 0 ? `\uFF1A${detailParts.join("\uFF1B")}` : ""}`
        }));
      }
      wrapper.appendChild(list);
      return wrapper;
    }
    function appendAnchors(parent, document2, anchors, options) {
      if (anchors.length === 0) return;
      const row = createElement(document2, "div", {
        className: "teaching-anchors",
        styles: { display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }
      });
      for (const anchor of anchors) {
        const chip = createElement(document2, "button", {
          className: "teaching-anchor-chip",
          text: anchor.label,
          title: anchor.excerpt,
          ariaLabel: `\u67E5\u770B\u6765\u6E90\uFF1A${anchor.label}`,
          attrs: { type: "button" },
          styles: {
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "999px",
            cursor: "pointer",
            border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3))",
            background: "transparent",
            color: "inherit",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        });
        chip.addEventListener("click", () => options.onAnchorClick?.(anchor));
        row.appendChild(chip);
      }
      parent.appendChild(row);
    }

    // packages/teaching-core/src/render/activity.ts
    var VERIFICATION_LABELS = {
      none: "\u65E0\u5BA2\u89C2\u6821\u9A8C",
      objective: "\u5BA2\u89C2\u6821\u9A8C\uFF08\u771F\u5B9E\u8FD0\u884C/\u6D4B\u8BD5\uFF09",
      rubric: "\u6309\u8BC4\u5206\u6807\u51C6\u8BC4\u4EF7",
      open: "\u5F00\u653E\u8BC4\u4EF7\uFF08\u4FDD\u7559\u4E0D\u786E\u5B9A\u6027\uFF09"
    };
    function asRecord(value) {
      return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
    }
    function isString(value) {
      return typeof value === "string";
    }
    function isFiniteNumber(value) {
      return typeof value === "number" && Number.isFinite(value);
    }
    function isStringArray(value) {
      return Array.isArray(value) && value.every(isString);
    }
    function validationError(message) {
      return err("invalid-input", `\u6D3B\u52A8\u6570\u636E\u65E0\u6548\uFF1A${message}`);
    }
    function validateGraph(payload) {
      const xRange = payload.xRange;
      const yRange = payload.yRange;
      if (!Array.isArray(xRange) || xRange.length !== 2 || !xRange.every(isFiniteNumber)) return validationError("graph.xRange \u5FC5\u987B\u662F\u4E24\u4E2A\u6570\u5B57");
      if (!Array.isArray(yRange) || yRange.length !== 2 || !yRange.every(isFiniteNumber)) return validationError("graph.yRange \u5FC5\u987B\u662F\u4E24\u4E2A\u6570\u5B57");
      if (xRange[0] === xRange[1]) return validationError("graph.xRange \u4E0D\u80FD\u4E3A\u96F6\u5BBD");
      if (yRange[0] === yRange[1]) return validationError("graph.yRange \u4E0D\u80FD\u4E3A\u96F6\u9AD8");
      if (!Array.isArray(payload.series) || payload.series.length === 0) return validationError("graph.series \u4E0D\u80FD\u4E3A\u7A7A");
      const params = Array.isArray(payload.params) ? payload.params : [];
      const paramNames = /* @__PURE__ */ new Set();
      for (const param of params) {
        const record = asRecord(param);
        if (record === void 0 || !isString(record.name) || !isString(record.label) || !isFiniteNumber(record.min) || !isFiniteNumber(record.max) || !isFiniteNumber(record.step) || !isFiniteNumber(record.value)) return validationError("graph.params \u9879\u9700\u8981 name/label/min/max/step/value");
        if (record.min > record.max) return validationError(`\u53C2\u6570 ${record.name} \u7684 min \u5927\u4E8E max`);
        if (record.step <= 0) return validationError(`\u53C2\u6570 ${record.name} \u7684 step \u5FC5\u987B\u4E3A\u6B63\u6570`);
        paramNames.add(record.name);
      }
      for (const series of payload.series) {
        const record = asRecord(series);
        if (record === void 0 || !isString(record.id) || !isString(record.label) || !isString(record.expr)) {
          return validationError("graph.series \u9879\u9700\u8981 id/label/expr");
        }
        try {
          compileExpression(record.expr, { variables: ["x", ...paramNames] });
        } catch (error) {
          return validationError(`\u51FD\u6570\u300C${record.label}\u300D\u8868\u8FBE\u5F0F\u65E0\u6CD5\u89E3\u6790\uFF1A${error instanceof Error ? error.message : String(error)}`);
        }
      }
      const animation = asRecord(payload.animation);
      if (animation !== void 0) {
        if (!isString(animation.param) || !isFiniteNumber(animation.from) || !isFiniteNumber(animation.to) || !isFiniteNumber(animation.durationMs) || animation.durationMs <= 0) {
          return validationError("graph.animation \u9700\u8981 param/from/to/\u6B63\u6570 durationMs");
        }
        if (!paramNames.has(animation.param) && animation.param !== "x") {
          return validationError(`graph.animation.param\u300C${animation.param}\u300D\u4E0D\u5728 params \u4E2D`);
        }
      }
      return ok(payload);
    }
    function validateFigure(payload) {
      const variants = ["bar-chart", "scatter", "concept-map", "flow", "table"];
      if (!isString(payload.variant) || !variants.includes(payload.variant)) return validationError("figure.variant \u4E0D\u53D7\u652F\u6301");
      if (payload.data !== void 0) {
        if (!Array.isArray(payload.data)) return validationError("figure.data \u5FC5\u987B\u662F\u6570\u7EC4");
        for (const point of payload.data) {
          const record = asRecord(point);
          if (record === void 0 || !isString(record.label) || !isFiniteNumber(record.y)) return validationError("figure.data \u9879\u9700\u8981 label/y");
          if (record.x !== void 0 && !isFiniteNumber(record.x)) return validationError("figure.data.x \u5FC5\u987B\u662F\u6570\u5B57");
        }
      }
      if (payload.nodes !== void 0) {
        if (!Array.isArray(payload.nodes)) return validationError("figure.nodes \u5FC5\u987B\u662F\u6570\u7EC4");
        const ids = /* @__PURE__ */ new Set();
        for (const node of payload.nodes) {
          const record = asRecord(node);
          if (record === void 0 || !isString(record.id) || !isString(record.label)) return validationError("figure.nodes \u9879\u9700\u8981 id/label");
          if (ids.has(record.id)) return validationError(`figure.nodes \u91CD\u590D id\uFF1A${record.id}`);
          ids.add(record.id);
        }
        if (payload.edges !== void 0) {
          if (!Array.isArray(payload.edges)) return validationError("figure.edges \u5FC5\u987B\u662F\u6570\u7EC4");
          for (const edge of payload.edges) {
            const record = asRecord(edge);
            if (record === void 0 || !isString(record.from) || !isString(record.to)) return validationError("figure.edges \u9879\u9700\u8981 from/to");
            if (!ids.has(record.from) || !ids.has(record.to)) return validationError("figure.edges \u5F15\u7528\u4E86\u4E0D\u5B58\u5728\u7684\u8282\u70B9");
          }
        }
      }
      return ok(payload);
    }
    function validateDerivation(payload) {
      if (!Array.isArray(payload.steps) || payload.steps.length === 0) return validationError("derivation.steps \u4E0D\u80FD\u4E3A\u7A7A");
      const ids = /* @__PURE__ */ new Set();
      for (const step of payload.steps) {
        const record = asRecord(step);
        if (record === void 0 || !isString(record.id) || !isString(record.latex)) return validationError("derivation.steps \u9879\u9700\u8981 id/latex");
        if (ids.has(record.id)) return validationError(`derivation.steps \u91CD\u590D id\uFF1A${record.id}`);
        if (record.dependsOn !== void 0 && !isStringArray(record.dependsOn)) return validationError("derivation.steps.dependsOn \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
        ids.add(record.id);
      }
      for (const step of payload.steps) {
        for (const dependency of asRecord(step)?.dependsOn ?? []) {
          if (!ids.has(dependency)) return validationError(`derivation \u6B65\u9AA4\u4F9D\u8D56\u4E0D\u5B58\u5728\uFF1A${dependency}`);
        }
      }
      return ok(payload);
    }
    function validateCodeRun(payload) {
      if (!isString(payload.language)) return validationError("code-run.language \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      if (typeof payload.code !== "string") return validationError("code-run.code \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      if (typeof payload.editable !== "boolean") return validationError("code-run.editable \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
      if (payload.tests !== void 0) {
        if (!Array.isArray(payload.tests)) return validationError("code-run.tests \u5FC5\u987B\u662F\u6570\u7EC4");
        for (const test of payload.tests) {
          const record = asRecord(test);
          if (record === void 0 || !isString(record.name) || !isString(record.type)) return validationError("code-run.tests \u9879\u9700\u8981 name/type");
          if (!["stdout-contains", "stdout-equals", "exit-code"].includes(record.type)) return validationError("code-run.tests.type \u4E0D\u53D7\u652F\u6301");
        }
      }
      return ok(payload);
    }
    function validateQuiz(payload) {
      if (!isString(payload.question)) return validationError("quiz.question \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      if (!Array.isArray(payload.options) || payload.options.length === 0) return validationError("quiz.options \u4E0D\u80FD\u4E3A\u7A7A");
      const ids = /* @__PURE__ */ new Set();
      for (const option of payload.options) {
        const record = asRecord(option);
        if (record === void 0 || !isString(record.id) || !isString(record.label)) return validationError("quiz.options \u9879\u9700\u8981 id/label");
        if (ids.has(record.id)) return validationError(`quiz.options \u91CD\u590D id\uFF1A${record.id}`);
        ids.add(record.id);
      }
      if (!isStringArray(payload.correctOptionIds)) return validationError("quiz.correctOptionIds \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
      for (const id of payload.correctOptionIds) {
        if (!ids.has(id)) return validationError(`quiz.correctOptionIds \u5F15\u7528\u4E86\u4E0D\u5B58\u5728\u7684\u9009\u9879\uFF1A${id}`);
      }
      if (payload.multiple !== void 0 && typeof payload.multiple !== "boolean") return validationError("quiz.multiple \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
      return ok(payload);
    }
    function validateRubric(rubric) {
      if (!Array.isArray(rubric) || rubric.length === 0) return validationError("rubric \u4E0D\u80FD\u4E3A\u7A7A");
      for (const criterion of rubric) {
        const record = asRecord(criterion);
        if (record === void 0 || !isString(record.id) || !isString(record.label) || !isFiniteNumber(record.weight)) {
          return validationError("rubric \u9879\u9700\u8981 id/label/weight");
        }
      }
      return ok(rubric);
    }
    function validateReadingTask(payload) {
      if (!isString(payload.instructions)) return validationError("reading-task.instructions \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      if (!Array.isArray(payload.anchors)) return validationError("reading-task.anchors \u5FC5\u987B\u662F\u6570\u7EC4");
      for (const anchor of payload.anchors) {
        const record = asRecord(anchor);
        if (record === void 0 || !isString(record.label) || !isString(record.excerpt)) return validationError("reading-task.anchors \u9879\u9700\u8981 label/excerpt");
      }
      if (!isStringArray(payload.questions)) return validationError("reading-task.questions \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
      return ok(payload);
    }
    function validateProofTask(payload) {
      if (!isString(payload.claim)) return validationError("proof-task.claim \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      if (!isStringArray(payload.assumptions)) return validationError("proof-task.assumptions \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
      const rubric = validateRubric(payload.rubric);
      if (!rubric.ok) return rubric;
      return ok(payload);
    }
    function validateOpenQuestion(payload) {
      if (!isString(payload.prompt)) return validationError("open-question.prompt \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      const rubric = validateRubric(payload.rubric);
      if (!rubric.ok) return rubric;
      if (payload.referencePoints !== void 0 && !isStringArray(payload.referencePoints)) return validationError("open-question.referencePoints \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
      return ok(payload);
    }
    function validateExplanation(payload) {
      if (!isString(payload.markdown)) return validationError("explanation.markdown \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      if (payload.keyPoints !== void 0 && !isStringArray(payload.keyPoints)) return validationError("explanation.keyPoints \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
      if (payload.caveats !== void 0 && !isStringArray(payload.caveats)) return validationError("explanation.caveats \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
      return ok(payload);
    }
    function validateExperimentNote(payload) {
      if (!isString(payload.title) || !isString(payload.markdown)) return validationError("experiment-note \u9700\u8981 title/markdown");
      if (payload.limitations !== void 0 && !isStringArray(payload.limitations)) return validationError("experiment-note.limitations \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
      return ok(payload);
    }
    function validateActivityPayload(input) {
      const payload = asRecord(input);
      if (payload === void 0) return validationError("payload \u4E0D\u662F\u5BF9\u8C61");
      if (!isString(payload.type)) return validationError("\u7F3A\u5C11 type \u5B57\u6BB5");
      switch (payload.type) {
        case "graph":
          return validateGraph(payload);
        case "figure":
          return validateFigure(payload);
        case "derivation":
          return validateDerivation(payload);
        case "code-run":
          return validateCodeRun(payload);
        case "quiz":
          return validateQuiz(payload);
        case "reading-task":
          return validateReadingTask(payload);
        case "proof-task":
          return validateProofTask(payload);
        case "open-question":
          return validateOpenQuestion(payload);
        case "explanation":
          return validateExplanation(payload);
        case "experiment-note":
          return validateExperimentNote(payload);
        default:
          return validationError(`\u4E0D\u652F\u6301\u7684\u6D3B\u52A8\u7C7B\u578B\u300C${payload.type}\u300D`);
      }
    }
    function isLessonActivity(input) {
      return "kind" in input && typeof input.kind === "string" && "sessionId" in input && "revision" in input;
    }
    function toInput(input) {
      if (!isLessonActivity(input)) return input;
      return {
        payload: input.payload,
        id: input.id,
        revision: input.revision,
        title: input.title,
        goal: input.goal,
        sourceRefs: input.sourceRefs,
        verification: input.verification
      };
    }
    function mountActivity(container, input, options = {}) {
      const document2 = resolveDocument(options);
      const activity = toInput(input);
      const payload = activity.payload;
      const callbacks = options.callbacks ?? {};
      const state = {};
      const recordState = (patch) => {
        if (patch.params !== void 0) state.params = { ...patch.params };
        if (patch.code !== void 0) state.code = patch.code;
        if (patch.revealedStepIds !== void 0) state.revealedStepIds = [...patch.revealedStepIds];
        callbacks.onStateChange?.(patch);
      };
      const wrapper = createElement(document2, "div", {
        className: `teaching-activity teaching-activity-${payload.type}`,
        attrs: {
          "data-activity-id": activity.id ?? "",
          "data-activity-revision": String(activity.revision ?? 0)
        },
        styles: {
          border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25))",
          borderRadius: "10px",
          padding: "10px 12px",
          background: "var(--dsw-alias-bg-base, transparent)"
        }
      });
      const title = activity.title ?? ("title" in payload ? payload.title : void 0) ?? "\u6559\u5B66\u6D3B\u52A8";
      wrapper.appendChild(createElement(document2, "div", {
        className: "teaching-activity-title",
        text: title,
        styles: { fontWeight: "600", fontSize: "14px", marginBottom: "2px" }
      }));
      if (activity.goal !== void 0) {
        wrapper.appendChild(createElement(document2, "div", {
          className: "teaching-activity-goal",
          text: `\u76EE\u6807\uFF1A${activity.goal}`,
          styles: { fontSize: "12px", opacity: "0.75", marginBottom: "4px" }
        }));
      }
      if (activity.verification !== void 0) {
        const label = VERIFICATION_LABELS[activity.verification.kind] ?? activity.verification.kind;
        wrapper.appendChild(createElement(document2, "div", {
          className: "teaching-activity-verification",
          text: `${label}${activity.verification.note !== void 0 ? ` \xB7 ${activity.verification.note}` : ""}`,
          styles: { fontSize: "11px", opacity: "0.65", marginBottom: "6px" }
        }));
      }
      if ((activity.sourceRefs ?? []).length > 0) {
        appendAnchors(wrapper, document2, activity.sourceRefs ?? [], { document: document2, ...callbacks.onAnchorClick !== void 0 ? { onAnchorClick: callbacks.onAnchorClick } : {} });
      }
      const content = createElement(document2, "div", { className: "teaching-activity-body" });
      wrapper.appendChild(content);
      const disposers = [];
      switch (payload.type) {
        case "graph": {
          const handle = mountGraph(content, payload, {
            document: document2,
            ...options.state?.params !== void 0 ? { params: options.state.params } : {},
            onChange: (params) => recordState({ params }),
            ...options.requestFrame !== void 0 ? { requestFrame: options.requestFrame } : {},
            ...options.cancelFrame !== void 0 ? { cancelFrame: options.cancelFrame } : {}
          });
          state.params = { ...handle.getParams() };
          disposers.push(() => handle.dispose());
          break;
        }
        case "figure": {
          const handle = mountFigure(content, payload, { document: document2 });
          disposers.push(() => handle.dispose());
          break;
        }
        case "derivation": {
          const handle = mountDerivation(content, payload, {
            document: document2,
            ...options.state?.revealedStepIds !== void 0 ? { revealedStepIds: options.state.revealedStepIds } : {},
            onChange: (revealedStepIds) => recordState({ revealedStepIds })
          });
          const initialRevealed = handle.getRevealed();
          if (initialRevealed.length > 0) state.revealedStepIds = [...initialRevealed];
          disposers.push(() => handle.dispose());
          break;
        }
        case "code-run": {
          const handle = mountCodeRun(content, payload, {
            document: document2,
            ...options.state?.code !== void 0 ? { code: options.state.code } : {},
            ...options.offline === true || callbacks.onRunCode === void 0 ? {} : { onRun: callbacks.onRunCode },
            ...callbacks.onCancelRun !== void 0 ? { onCancel: callbacks.onCancelRun } : {},
            onChange: (code) => recordState({ code })
          });
          state.code = handle.getCode();
          disposers.push(() => handle.dispose());
          break;
        }
        case "quiz": {
          const handle = mountQuiz(content, payload, {
            document: document2,
            ...callbacks.onQuizSubmit !== void 0 ? { onSubmit: callbacks.onQuizSubmit } : {},
            ...callbacks.onHelpExposure !== void 0 ? { onHelpExposed: (help) => callbacks.onHelpExposure?.(help) } : {}
          });
          disposers.push(() => handle.dispose());
          break;
        }
        case "explanation": {
          const handle = mountExplanation(content, payload, { document: document2 });
          disposers.push(() => handle.dispose());
          break;
        }
        case "reading-task": {
          const handle = mountReadingTask(content, payload, {
            document: document2,
            ...callbacks.onAnchorClick !== void 0 ? { onAnchorClick: callbacks.onAnchorClick } : {}
          });
          disposers.push(() => handle.dispose());
          break;
        }
        case "proof-task": {
          const handle = mountProofTask(content, payload, {
            document: document2,
            ...callbacks.onAnswerSubmit !== void 0 ? { onSubmitAnswer: (answerText) => callbacks.onAnswerSubmit?.({ answerText }) } : {},
            ...callbacks.onHelpExposure !== void 0 ? { onHelpExposed: (help) => callbacks.onHelpExposure?.(help) } : {},
            ...callbacks.onAnchorClick !== void 0 ? { onAnchorClick: callbacks.onAnchorClick } : {}
          });
          disposers.push(() => handle.dispose());
          break;
        }
        case "open-question": {
          const handle = mountOpenQuestion(content, payload, {
            document: document2,
            ...callbacks.onAnswerSubmit !== void 0 ? { onSubmitAnswer: (answerText) => callbacks.onAnswerSubmit?.({ answerText }) } : {},
            ...callbacks.onHelpExposure !== void 0 ? { onHelpExposed: (help) => callbacks.onHelpExposure?.(help) } : {}
          });
          disposers.push(() => handle.dispose());
          break;
        }
        case "experiment-note": {
          const handle = mountExperimentNote(content, payload, { document: document2 });
          disposers.push(() => handle.dispose());
          break;
        }
      }
      container.appendChild(wrapper);
      return {
        element: wrapper,
        getState: () => ({ ...state }),
        dispose: () => {
          for (const dispose of disposers) dispose();
          disposers.length = 0;
          wrapper.remove();
        }
      };
    }

    // packages/dsh-plugin/src/client/components/Markdown.tsx
    var import_jsx_runtime2 = require("react/jsx-runtime");
    function RenderedMarkdown({ source }) {
      const host = (0, import_react2.useRef)(null);
      (0, import_react2.useEffect)(() => {
        const element = host.current;
        if (element === null) return;
        element.textContent = "";
        element.appendChild(renderMarkdown(document, source));
        return () => {
          element.textContent = "";
        };
      }, [source]);
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { ref: host, className: "teaching-markdown-host" });
    }

    // packages/dsh-plugin/src/client/components/ChatPanel.tsx
    var import_jsx_runtime3 = require("react/jsx-runtime");
    var QUICK_ACTION_LABELS = {
      skip: "\u8DF3\u8FC7\u7EC3\u4E60",
      hint: "\u7ED9\u63D0\u793A",
      "full-answer": "\u770B\u5B8C\u6574\u7B54\u6848",
      restyle: "\u6362\u79CD\u8BB2\u6CD5"
    };
    var QUICK_ACTION_PROMPTS = {
      skip: "\u8BF7\u8DF3\u8FC7\u5F53\u524D\u7EC3\u4E60\uFF0C\u76F4\u63A5\u7EE7\u7EED\u540E\u9762\u7684\u6559\u5B66\u3002",
      hint: "\u8BF7\u7ED9\u5F53\u524D\u7EC3\u4E60\u4E00\u70B9\u63D0\u793A\uFF0C\u4F46\u4E0D\u8981\u76F4\u63A5\u7ED9\u7B54\u6848\u3002",
      "full-answer": "\u8BF7\u770B\u5B8C\u6574\u7B54\u6848\uFF0C\u5E76\u5728\u4E4B\u540E\u89E3\u91CA\u5B83\u7684\u63A8\u7406\u8FC7\u7A0B\u3002",
      restyle: "\u8BF7\u6362\u4E00\u79CD\u8BB2\u6CD5\u91CD\u65B0\u89E3\u91CA\u521A\u624D\u7684\u5185\u5BB9\u3002"
    };
    function EvidenceChips(props) {
      const [expanded, setExpanded] = (0, import_react3.useState)(void 0);
      if (props.refs.length === 0) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ai-evidence-row", children: props.refs.map((reference, index) => {
        const label = reference.label ?? reference.anchor?.label ?? EVIDENCE_KIND_LABELS[reference.kind];
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_react3.default.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "button",
            {
              type: "button",
              className: "ai-evidence-chip",
              "data-kind": reference.kind,
              "aria-label": `\u8BC1\u636E\u6765\u6E90 ${label}`,
              onClick: () => setExpanded(expanded === index ? void 0 : index),
              title: reference.note ?? label,
              children: [
                EVIDENCE_KIND_LABELS[reference.kind],
                " \xB7 ",
                truncate(label, 34)
              ]
            }
          ),
          expanded === index && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ai-evidence-detail", children: [
            reference.anchor !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                "\u539F\u6587\u4F4D\u7F6E\uFF1A",
                reference.anchor.label,
                formatPage(reference.anchor.locator)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                "\u539F\u6587\u7247\u6BB5\uFF1A",
                truncate(reference.anchor.excerpt, 800)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ai-muted", children: [
                "\u62BD\u53D6\u7F6E\u4FE1\u5EA6\uFF1A",
                reference.anchor.confidence
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "ai-link-button", onClick: () => props.onEvidenceClick(reference), children: "\u5728\u201C\u6765\u6E90\u201D\u4E2D\u67E5\u770B\u539F\u6587" })
            ] }),
            reference.url !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
              "\u5916\u90E8\u6765\u6E90\uFF1A",
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("a", { href: reference.url, target: "_blank", rel: "noopener noreferrer", children: truncate(reference.url, 80) }),
              reference.accessedAt !== void 0 ? `\uFF08\u8BBF\u95EE\u4E8E ${reference.accessedAt}\uFF09` : ""
            ] }),
            reference.note !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
              "\u8BF4\u660E\uFF1A",
              reference.note
            ] }),
            reference.premises !== void 0 && reference.premises.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
              "\u524D\u63D0\uFF1A",
              reference.premises.join("\uFF1B")
            ] }),
            reference.confidence !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ai-muted", children: [
              "\u5185\u5BB9\u7F6E\u4FE1\u5EA6\uFF1A",
              reference.confidence
            ] })
          ] })
        ] }, `${reference.kind}-${index}-${label}`);
      }) });
    }
    function formatPage(locator) {
      if (locator.page !== void 0) return ` \xB7 \u7B2C ${locator.page} \u9875`;
      if (locator.slide !== void 0) return ` \xB7 \u7B2C ${locator.slide} \u5F20\u5E7B\u706F\u7247`;
      if (locator.lines !== void 0) return ` \xB7 \u7B2C ${locator.lines[0]}\u2013${locator.lines[1]} \u884C`;
      return "";
    }
    function MessageBubble(props) {
      const { message } = props;
      const roleClass = message.role === "student" ? "ai-msg-student" : message.role === "system" ? "ai-msg-system" : "ai-msg-teacher";
      const linkedActivities = (message.activityIds ?? []).map((id) => props.activities.find((activity) => activity.id === id)).filter((activity) => activity !== void 0);
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("article", { className: `ai-msg ${roleClass}`, "data-role": message.role, children: [
        message.role === "teacher" && message.kind !== "teacher-explanation" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ai-muted", style: { marginBottom: 2 }, children: TEACHER_KIND_LABELS[message.kind] ?? "" }),
        message.markdown === true ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(RenderedMarkdown, { source: message.text }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { whiteSpace: "pre-wrap" }, children: message.text }),
        linkedActivities.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ai-evidence-row", children: linkedActivities.map((activity) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "button",
          {
            type: "button",
            className: "ai-evidence-chip",
            onClick: () => props.onActivityClick(activity.id),
            "aria-label": `\u6253\u5F00\u6D3B\u52A8 ${activity.title}`,
            children: [
              "\u6D3B\u52A8 \xB7 ",
              truncate(activity.title, 30)
            ]
          },
          activity.id
        )) }),
        message.evidenceRefs !== void 0 && message.evidenceRefs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(EvidenceChips, { refs: message.evidenceRefs, onEvidenceClick: props.onEvidenceClick }),
        message.error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ai-muted", style: { color: "var(--dsw-alias-state-error-primary, #b91c1c)" }, children: [
          "\u5931\u8D25\uFF1A",
          message.error.message
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ai-msg-meta", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: formatTime(message.createdAt) }),
          message.usage !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { title: message.usage.usageUnknown === true ? "\u6A21\u578B\u672A\u62A5\u544A\u7528\u91CF" : void 0, children: [
            message.usage.model,
            message.usage.durationMs >= 0 ? ` \xB7 ${Math.round(message.usage.durationMs / 100) / 10}s` : "",
            message.usage.usageUnknown === true ? " \xB7 \u7528\u91CF\u672A\u77E5" : ""
          ] })
        ] })
      ] });
    }
    var TEACHER_KIND_LABELS = {
      "teacher-diagnosis": "\u8BCA\u65AD",
      "teacher-hint": "\u63D0\u793A",
      "teacher-feedback": "\u53CD\u9988",
      "teacher-question": "\u63D0\u95EE"
    };
    function ChatPanel(props) {
      const [draft, setDraft] = (0, import_react3.useState)("");
      const scrollRef = (0, import_react3.useRef)(null);
      const scrollToBottom = (0, import_react3.useCallback)(() => {
        const element = scrollRef.current;
        if (element !== null) element.scrollTop = element.scrollHeight;
      }, []);
      (0, import_react3.useEffect)(() => {
        scrollToBottom();
      }, [props.messages.length, props.chat.text, scrollToBottom]);
      const send = () => {
        const text2 = draft.trim();
        if (text2 === "" || props.busy) return;
        setDraft("");
        props.onSend(text2);
      };
      const session = props.session;
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "ai-chat-panel", "aria-label": "\u6559\u5B66\u5BF9\u8BDD", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ai-chat-scroll", ref: scrollRef, children: [
          session === void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ai-empty", children: "\u9009\u62E9\u5DE6\u4FA7\u8BFE\u7A0B\u4E0E\u4F1A\u8BDD\uFF0C\u6216\u65B0\u5EFA\u4E00\u4E2A\u5B66\u4E60\u4F1A\u8BDD\u5F00\u59CB\u3002" }),
          props.messages.map((message) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            MessageBubble,
            {
              message,
              activities: props.activities,
              onActivityClick: props.onActivityClick,
              onEvidenceClick: props.onEvidenceClick
            },
            message.id
          )),
          props.chat.text !== "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("article", { className: "ai-msg ai-msg-teacher", "data-streaming": "true", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(RenderedMarkdown, { source: props.chat.text }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ai-msg-meta", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "ai-spinner", "aria-label": "\u6B63\u5728\u751F\u6210" }) })
          ] }),
          props.chat.error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            Banner,
            {
              kind: props.chat.error.retryable === true ? "warning" : "error",
              message: props.chat.error.code === "cancelled" ? "\u5DF2\u505C\u6B62\u751F\u6210\u3002" : `\u672C\u8F6E\u751F\u6210\u5931\u8D25\uFF1A${props.chat.error.message}`,
              details: props.chat.error.code,
              onDismiss: props.onDismissError,
              actions: props.chat.error.retryable === true ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "ai-small-button", onClick: props.onRetry, children: "\u91CD\u8BD5\u4E0A\u4E00\u6761" }) : void 0
            }
          ),
          props.session !== void 0 && props.session.activities.length === 0 && props.messages.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ai-empty", children: "\u5728\u4E0B\u65B9\u8F93\u5165\u4F60\u7684\u5B66\u4E60\u76EE\u6807\u6216\u95EE\u9898\u5F00\u59CB\uFF1B\u4E5F\u53EF\u4EE5\u76F4\u63A5\u8BF4\u201C\u4ECE\u73B0\u5728\u5F00\u59CB\u7CFB\u7EDF\u5B66\u4E60\u201D\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ai-progress-line", children: [
          props.busy ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "ai-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "ai-spinner" }),
            props.chat.progressLabel ?? (props.chat.status === "stopping" ? "\u6B63\u5728\u505C\u6B62\u2026" : "\u6B63\u5728\u751F\u6210\u56DE\u7B54\u2026")
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "ai-muted", children: props.session !== void 0 ? `\u9636\u6BB5\uFF1A${STAGE_LABELS[props.session.session.position.stage]}` : "" }),
          props.chat.evidence.length > 0 && props.chat.text === "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "ai-muted", children: [
            "\u5DF2\u6536\u96C6 ",
            props.chat.evidence.length,
            " \u6761\u6765\u6E90"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ai-quick-actions", children: Object.keys(QUICK_ACTION_PROMPTS).map((action) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "button",
          {
            type: "button",
            className: "ai-small-button",
            disabled: props.busy || props.session === void 0,
            onClick: () => props.onQuickAction(action),
            "aria-label": `\u5FEB\u901F\u64CD\u4F5C\uFF1A${QUICK_ACTION_LABELS[action]}`,
            children: QUICK_ACTION_LABELS[action]
          },
          action
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ai-composer", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "textarea",
            {
              value: draft,
              "aria-label": "\u8F93\u5165\u4F60\u7684\u95EE\u9898",
              placeholder: props.offline ? "\u79BB\u7EBF\u72B6\u6001\uFF1A\u6062\u590D\u8FDE\u63A5\u540E\u53EF\u7EE7\u7EED\u53D1\u9001" : "\u8F93\u5165\u95EE\u9898\uFF0CEnter \u53D1\u9001\uFF0CShift+Enter \u6362\u884C",
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                }
              }
            }
          ),
          props.busy ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "ai-danger-button", onClick: props.onStop, "aria-label": "\u505C\u6B62\u751F\u6210", children: "\u505C\u6B62" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "ai-primary-button", onClick: send, disabled: draft.trim() === "" || props.offline, "aria-label": "\u53D1\u9001", children: "\u53D1\u9001" })
        ] })
      ] });
    }

    // packages/dsh-plugin/src/client/components/Onboarding.tsx
    var import_react5 = require("react");

    // packages/dsh-plugin/src/client/components/DraftReview.tsx
    var import_react4 = require("react");
    var import_jsx_runtime4 = require("react/jsx-runtime");
    function DraftReview(props) {
      const { draft } = props;
      const revision = draft.revision;
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ai-draft-review", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("h3", { style: { margin: "0 0 6px", fontSize: 14 }, children: [
          "\u8BFE\u7A0B\u7ED3\u6784\u8349\u6848\uFF08v",
          revision.version,
          "\uFF09"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ai-muted", children: [
          "\u6765\u6E90\u8986\u76D6\uFF1A",
          draft.coverage.length,
          " \u4EFD\u8D44\u6599 \xB7 \u6982\u5FF5 ",
          revision.concepts.length,
          " \u4E2A \xB7 \u5B66\u4E60\u987A\u5E8F ",
          revision.sequence.length,
          " \u6B65"
        ] }),
        draft.warnings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ul", { className: "ai-warning-list", children: draft.warnings.map((warning) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("li", { children: warning }, warning)) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ol", { className: "ai-checklist", children: revision.sequence.map((conceptId) => {
          const concept = revision.concepts.find((item) => item.id === conceptId);
          return concept === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("li", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { children: concept.title }),
            concept.summary !== "" ? ` \u2014 ${concept.summary}` : "",
            concept.sourceAnchors.length === 0 ? "\uFF08\u4EC5\u6A21\u578B\u77E5\u8BC6\uFF0C\u65E0\u8D44\u6599\u4F9D\u636E\uFF09" : ""
          ] }, concept.id);
        }) }),
        draft.coverage.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ai-muted", style: { marginTop: 6 }, children: [
          "\u8D44\u6599\uFF1A",
          draft.coverage.map((item) => `${item.title}\uFF08${item.status}\uFF0C${item.usedUnits} \u5355\u5143${item.issues > 0 ? `\uFF0C${item.issues} \u4E2A\u95EE\u9898` : ""}\uFF09`).join("\uFF1B")
        ] }),
        props.error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ai-banner", "data-kind": "error", role: "alert", style: { margin: "8px 0", borderRadius: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: props.error }) }),
        props.busy && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { marginTop: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Spinner, { label: "\u6B63\u5728\u5904\u7406\u2026" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ai-row", style: { marginTop: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "button",
            {
              type: "button",
              className: "ai-primary-button",
              disabled: props.busy || revision.concepts.length === 0,
              onClick: () => void props.onConfirm(),
              children: "\u786E\u8BA4\u7ED3\u6784\u5E76\u5F00\u59CB\u5B66\u4E60"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "ai-small-button", disabled: props.busy, onClick: () => void props.onRegenerate(), children: "\u91CD\u65B0\u751F\u6210\u8349\u6848" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "ai-small-button", disabled: props.busy, onClick: () => void props.onAdhoc(), children: "\u5148\u968F\u4FBF\u95EE\u95EE\uFF08\u968F\u95EE\u968F\u5B66\uFF09" }),
          props.onBack !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "ai-link-button", disabled: props.busy, onClick: props.onBack, children: "\u8FD4\u56DE\u8865\u5145\u8D44\u6599" })
        ] }),
        revision.concepts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ai-muted", style: { marginTop: 6 }, children: "\u8349\u6848\u8FD8\u6CA1\u6709\u6982\u5FF5\uFF1A\u8BF7\u5148\u5BFC\u5165\u53EF\u8BFB\u8D44\u6599\u540E\u91CD\u65B0\u751F\u6210\uFF0C\u6216\u76F4\u63A5\u300C\u5148\u968F\u4FBF\u95EE\u95EE\u300D\u7528\u6700\u5C0F\u7ED3\u6784\u5F00\u59CB\u3002" })
      ] });
    }

    // packages/dsh-plugin/src/client/components/Onboarding.tsx
    var import_jsx_runtime5 = require("react/jsx-runtime");
    var STEP_LABELS = {
      course: "1. \u5EFA\u7ACB\u8BFE\u7A0B",
      import: "2. \u5BFC\u5165\u672C\u5730\u8D44\u6599",
      draft: "3. \u786E\u8BA4\u8BFE\u7A0B\u7ED3\u6784"
    };
    function Onboarding(props) {
      const [step, setStep] = (0, import_react5.useState)("course");
      const [picking, setPicking] = (0, import_react5.useState)(false);
      const [title, setTitle] = (0, import_react5.useState)("");
      const [description, setDescription] = (0, import_react5.useState)("");
      const [goals, setGoals] = (0, import_react5.useState)("");
      const [language, setLanguage] = (0, import_react5.useState)("zh");
      const [pathsText, setPathsText] = (0, import_react5.useState)("");
      const [localError, setLocalError] = (0, import_react5.useState)(void 0);
      const [courseId, setCourseId] = (0, import_react5.useState)(props.courseId);
      const [draftPhase, setDraftPhase] = (0, import_react5.useState)("idle");
      const [draftError, setDraftError] = (0, import_react5.useState)(void 0);
      const [actionBusy, setActionBusy] = (0, import_react5.useState)(void 0);
      const paths = pathsText.split("\n").map((line) => line.trim()).filter((line) => line !== "");
      const importTasks = props.tasks.filter((task) => task.kind.includes("import") || task.kind.includes("source"));
      const draftTasks = props.tasks.filter((task) => task.kind.includes("draft") || task.kind.includes("course"));
      const importRunning = importTasks.some((task) => task.status === "running" || task.status === "queued");
      const draftRunning = draftTasks.some((task) => task.status === "running" || task.status === "queued");
      const busy = props.busy !== void 0 || actionBusy !== void 0;
      const createCourse = async () => {
        setLocalError(void 0);
        if (title.trim() === "") {
          setLocalError("\u8BF7\u5148\u586B\u5199\u8BFE\u7A0B\u540D\u79F0\u3002");
          return;
        }
        const created = await props.onCreateCourse({
          title: title.trim(),
          ...description.trim() !== "" ? { description: description.trim() } : {},
          goals: goals.split(/[；;\n]/u).map((goal) => goal.trim()).filter((goal) => goal !== ""),
          language
        });
        if (created !== void 0) {
          setCourseId(created);
          setStep("import");
        }
      };
      const pickDirectory = async () => {
        if (props.onPickDirectory === void 0) {
          setLocalError("\u5F53\u524D\u73AF\u5883\u6CA1\u6709\u53EF\u7528\u7684\u6587\u4EF6\u5939\u9009\u62E9\u5668\uFF0C\u8BF7\u76F4\u63A5\u8F93\u5165\u672C\u5730\u8DEF\u5F84\u3002");
          return;
        }
        setPicking(true);
        setLocalError(void 0);
        try {
          const picked = await props.onPickDirectory();
          if (picked !== null && picked !== "") {
            setPathsText((current) => current.trim() === "" ? picked : `${current.trimEnd()}
    ${picked}`);
          }
        } catch (cause) {
          setLocalError(`\u6253\u5F00\u9009\u62E9\u5668\u5931\u8D25\uFF1A${cause instanceof Error ? cause.message : String(cause)}\uFF0C\u8BF7\u76F4\u63A5\u8F93\u5165\u8DEF\u5F84\u3002`);
        } finally {
          setPicking(false);
        }
      };
      const importSources = async () => {
        setLocalError(void 0);
        if (courseId === void 0) return;
        if (paths.length === 0) {
          setLocalError("\u8BF7\u81F3\u5C11\u586B\u5199\u4E00\u4E2A\u672C\u5730\u6587\u4EF6\u6216\u76EE\u5F55\u8DEF\u5F84\u3002");
          return;
        }
        setActionBusy("\u5BFC\u5165\u8D44\u6599\u2026");
        const result = await props.onImportPaths(courseId, paths);
        setActionBusy(void 0);
        if (!result.ok) setLocalError(result.error ?? "\u8D44\u6599\u5BFC\u5165\u5931\u8D25");
      };
      const generateDraft = async () => {
        setLocalError(void 0);
        setDraftError(void 0);
        if (courseId === void 0) return;
        setStep("draft");
        setDraftPhase("running");
        const result = await props.onGenerateDraft(courseId);
        if (result.ok) {
          setDraftPhase("idle");
          setDraftError(void 0);
        } else {
          setDraftPhase("error");
          setDraftError(result.error ?? "\u8BFE\u7A0B\u8349\u6848\u751F\u6210\u5931\u8D25");
        }
      };
      const confirmDraft = async (revisionId) => {
        if (courseId === void 0 || revisionId === "") return;
        setDraftError(void 0);
        setActionBusy("\u786E\u8BA4\u8BFE\u7A0B\u7ED3\u6784\u2026");
        const result = await props.onConfirmDraft(courseId, revisionId);
        setActionBusy(void 0);
        if (!result.ok) setDraftError(result.error ?? "\u786E\u8BA4\u8BFE\u7A0B\u7ED3\u6784\u5931\u8D25");
      };
      const startAdhoc = async () => {
        if (courseId === void 0) return;
        setDraftError(void 0);
        setActionBusy("\u521B\u5EFA\u968F\u95EE\u968F\u5B66\u4F1A\u8BDD\u2026");
        const result = await props.onStartAdhoc(courseId);
        setActionBusy(void 0);
        if (!result.ok) setDraftError(result.error ?? "\u968F\u95EE\u968F\u5B66\u4F1A\u8BDD\u521B\u5EFA\u5931\u8D25");
      };
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-onboarding", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-onboarding-heading", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { style: { margin: 0 }, children: props.canCancel === true ? "\u6DFB\u52A0\u65B0\u8BFE\u7A0B" : "\u5F00\u59CB\u4F60\u7684\u5B66\u4E60" }),
          props.canCancel === true && props.onCancel !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "ai-small-button", onClick: () => props.onCancel?.(), "aria-label": "\u8FD4\u56DE\u5DE5\u4F5C\u533A", children: "\u8FD4\u56DE\u5DE5\u4F5C\u533A" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: "\u8D44\u6599\u53EA\u4FDD\u5B58\u5728\u672C\u673A\u3002\u6559\u5B66\u4EE5\u4F60\u7684\u8BFE\u7A0B\u8D44\u6599\u4E3A\u4F9D\u636E\uFF1B\u6A21\u578B\u8865\u5145\u3001\u5916\u90E8\u7F51\u9875\u4E0E\u5B9E\u9A8C\u8F93\u51FA\u4F1A\u5206\u522B\u6807\u6CE8\u6765\u6E90\u3002 \u9996\u6B21\u4F7F\u7528\u9700\u8981\u786E\u8BA4\u8BFE\u7A0B\u7ED3\u6784\uFF0C\u4E4B\u540E\u53EF\u4EE5\u968F\u65F6\u63D0\u95EE\u6216\u7EE7\u7EED\u7CFB\u7EDF\u5B66\u4E60\u3002" }),
        props.bootstrap !== void 0 && props.bootstrap.features.imageOcr === false && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Banner, { kind: "warning", message: "\u5F53\u524D\u672A\u542F\u7528\u56FE\u7247/\u626B\u63CF\u8D44\u6599\u8BC6\u522B\u80FD\u529B\uFF1A\u626B\u63CF\u4EF6\u4E0E\u56FE\u7247\u4E2D\u7684\u516C\u5F0F\u56FE\u8868\u65E0\u6CD5\u4FDD\u8BC1\u88AB\u8BFB\u53D6\uFF0C\u53EF\u5728\u540E\u7EED\u7248\u672C\u63A5\u5165\u3002" }),
        props.error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Banner, { kind: "error", message: props.error.message, details: props.error.code, onDismiss: props.onDismissError }),
        localError !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Banner, { kind: "error", message: localError, onDismiss: () => setLocalError(void 0) }),
        busy && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { marginBottom: 10 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Spinner, { label: actionBusy ?? props.busy ?? "\u5904\u7406\u4E2D\u2026" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(TaskProgressBar, { tasks: props.tasks, onCancel: props.onCancelTask }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ai-row", style: { margin: "12px 0 6px" }, children: Object.keys(STEP_LABELS).map((key) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "ai-badge", style: { opacity: step === key ? 1 : 0.55 }, children: STEP_LABELS[key] }, key)) }),
        step === "course" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-onboarding-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { htmlFor: "ai-course-title", children: "\u8BFE\u7A0B\u540D\u79F0" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "input",
              {
                id: "ai-course-title",
                value: title,
                onChange: (event) => setTitle(event.target.value),
                placeholder: "\u4F8B\u5982\uFF1ASICP \u8BA1\u7B97\u673A\u7A0B\u5E8F\u7684\u6784\u9020\u4E0E\u89E3\u91CA"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { htmlFor: "ai-course-goals", children: "\u5B66\u4E60\u76EE\u6807\uFF08\u7528\u5206\u53F7\u5206\u9694\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "input",
              {
                id: "ai-course-goals",
                value: goals,
                onChange: (event) => setGoals(event.target.value),
                placeholder: "\u4F8B\u5982\uFF1A\u7406\u89E3\u9012\u5F52\u4E0E\u9AD8\u9636\u51FD\u6570\uFF1B\u80FD\u72EC\u7ACB\u5206\u6790\u672A\u89C1\u7A0B\u5E8F"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "ai-field-hint", children: "\u76EE\u6807\u4F1A\u7528\u4E8E\u8BFE\u7A0B\u7ED3\u6784\u8349\u6848\uFF1B\u4E4B\u540E\u4E5F\u53EF\u4EE5\u8865\u5145\u3002" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { htmlFor: "ai-course-desc", children: "\u8BFE\u7A0B\u8BF4\u660E\uFF08\u53EF\u9009\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("textarea", { id: "ai-course-desc", rows: 2, value: description, onChange: (event) => setDescription(event.target.value) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { htmlFor: "ai-course-language", children: "\u9ED8\u8BA4\u8BB2\u89E3\u8BED\u8A00" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("select", { id: "ai-course-language", value: language, onChange: (event) => setLanguage(event.target.value), children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "zh", children: "\u4E2D\u6587\uFF08\u4FDD\u7559\u82F1\u6587\u672F\u8BED\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "bilingual", children: "\u4E2D\u82F1\u53CC\u8BED" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "en", children: "English" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "ai-primary-button", onClick: () => void createCourse(), disabled: busy, children: "\u5EFA\u7ACB\u8BFE\u7A0B\u5E76\u7EE7\u7EED" })
        ] }),
        step === "import" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-onboarding-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("label", { htmlFor: "ai-source-paths", children: "\u672C\u5730\u8D44\u6599\u8DEF\u5F84\uFF08\u6BCF\u884C\u4E00\u4E2A\u6587\u4EF6\u6216\u76EE\u5F55\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "textarea",
              {
                id: "ai-source-paths",
                rows: 4,
                value: pathsText,
                onChange: (event) => setPathsText(event.target.value),
                placeholder: "/Users/you/Documents/SICP.pdf\n/Users/you/Documents/\u8BFE\u7A0B\u7B14\u8BB0.md\n/Users/you/Documents/\u4EE3\u7801\u5B9E\u9A8C"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-row", style: { marginTop: 6 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
                "button",
                {
                  type: "button",
                  className: "ai-small-button",
                  onClick: () => void pickDirectory(),
                  disabled: picking,
                  "aria-label": "\u9009\u62E9\u8D44\u6599\u6587\u4EF6\u5939",
                  title: "\u6253\u5F00\u6587\u4EF6\u7BA1\u7406\u5668\u9009\u62E9\u8D44\u6599\u6240\u5728\u6587\u4EF6\u5939\uFF08Host \u4F1A\u9012\u5F52\u5BFC\u5165\u5176\u4E2D\u7684\u652F\u6301\u683C\u5F0F\uFF09",
                  children: picking ? "\u6B63\u5728\u6253\u5F00\u9009\u62E9\u5668\u2026" : "\u{1F4C2} \u9009\u62E9\u8D44\u6599\u6587\u4EF6\u5939\u2026"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "ai-field-hint", children: "\u53EF\u9009\u62E9\u6587\u4EF6\u5939\uFF08\u4F1A\u81EA\u52A8\u6536\u96C6\u5176\u4E2D\u7684 Markdown/\u6587\u672C/PDF/\u56FE\u7247/Word/PPT/\u4EE3\u7801/Notebook\uFF09\uFF0C\u4E5F\u53EF\u76F4\u63A5\u8F93\u5165\u591A\u4E2A\u6587\u4EF6\u8DEF\u5F84\u3002" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "ai-primary-button", onClick: () => void importSources(), disabled: busy || importRunning, children: importRunning ? "\u5BFC\u5165\u4E2D\u2026" : "\u5BFC\u5165\u8D44\u6599" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "button",
              {
                type: "button",
                className: "ai-small-button",
                onClick: () => void generateDraft(),
                disabled: busy || draftRunning,
                children: draftRunning ? "\u6B63\u5728\u751F\u6210\u8BFE\u7A0B\u8349\u6848\u2026" : "\u751F\u6210\u8BFE\u7A0B\u8349\u6848"
              }
            ),
            importRunning && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "ai-muted", children: "\u6B63\u5728\u5BFC\u5165\uFF1B\u5B8C\u6210\u540E\u53EF\u751F\u6210\u8BFE\u7A0B\u8349\u6848\u3002" })
          ] }),
          importTasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { marginTop: 8 }, children: importTasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-muted", children: [
            task.label,
            "\uFF1A",
            task.status,
            formatPercent(task.progress) !== "" ? ` ${formatPercent(task.progress)}` : "",
            task.error !== void 0 ? `\uFF08${task.error.message}\uFF09` : ""
          ] }, task.id)) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ai-muted", style: { marginTop: 8 }, children: "\u60F3\u5148\u5F00\u59CB\u63D0\u95EE\uFF1F\u751F\u6210\u4EFB\u52A1\u5931\u8D25\u6216\u8D44\u6599\u8FD8\u6CA1\u51C6\u5907\u597D\u65F6\uFF0C\u53EF\u4EE5\u5728\u4E0B\u4E00\u6B65\u9009\u62E9\u300C\u5148\u968F\u4FBF\u95EE\u95EE\uFF08\u968F\u95EE\u968F\u5B66\uFF09\u300D\u3002" })
        ] }),
        step === "draft" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-onboarding-card", children: [
          props.draft !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            DraftReview,
            {
              draft: props.draft,
              busy,
              ...draftError !== void 0 ? { error: draftError } : {},
              onConfirm: () => props.draft === void 0 ? void 0 : confirmDraft(props.draft.revision.id),
              onRegenerate: () => void generateDraft(),
              onAdhoc: () => void startAdhoc(),
              onBack: () => setStep("import")
            }
          ),
          props.draft === void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-row", style: { alignItems: "baseline" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { style: { margin: "0 0 4px", fontSize: 14 }, children: "\u8BFE\u7A0B\u7ED3\u6784\u8349\u6848" }),
              draftPhase === "running" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "ai-badge", children: "\u751F\u6210\u4E2D" }),
              draftPhase === "error" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "ai-badge", style: { color: "var(--dsw-alias-state-error-primary, #b91c1c)" }, children: "\u751F\u6210\u5931\u8D25" })
            ] }),
            draftPhase === "running" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Spinner, { label: "\u6B63\u5728\u5206\u6790\u8D44\u6599\u5E76\u751F\u6210\u8BFE\u7A0B\u7ED3\u6784\u2026" }),
            draftPhase === "error" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ai-banner", "data-kind": "error", role: "alert", style: { margin: "8px 0", borderRadius: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: draftError ?? "\u8BFE\u7A0B\u8349\u6848\u751F\u6210\u5931\u8D25" }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ai-muted", children: "\u53EF\u4EE5\u91CD\u8BD5\u751F\u6210\u3001\u8FD4\u56DE\u8865\u5145\u8D44\u6599\uFF0C\u6216\u76F4\u63A5\u300C\u5148\u968F\u4FBF\u95EE\u95EE\u300D\u7528\u6700\u5C0F\u7ED3\u6784\u5F00\u59CB\u5B66\u4E60\uFF08\u4E4B\u540E\u4ECD\u53EF\u518D\u751F\u6210\u5B8C\u6574\u8349\u6848\uFF09\u3002" })
            ] }),
            draftPhase === "idle" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "ai-muted", children: "\u8349\u6848\u8FD8\u6CA1\u6709\u751F\u6210\uFF1A\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u5F00\u59CB\u5206\u6790\u8D44\u6599\u3002" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "ai-row", style: { marginTop: 10 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "ai-primary-button", onClick: () => void generateDraft(), disabled: busy, children: draftPhase === "error" ? "\u91CD\u8BD5\u751F\u6210\u8349\u6848" : "\u751F\u6210\u8BFE\u7A0B\u8349\u6848" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "ai-small-button", onClick: () => void startAdhoc(), disabled: busy, children: "\u5148\u968F\u4FBF\u95EE\u95EE\uFF08\u968F\u95EE\u968F\u5B66\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "ai-link-button", onClick: () => setStep("import"), disabled: busy, children: "\u8FD4\u56DE\u8865\u5145\u8D44\u6599" })
            ] })
          ] })
        ] })
      ] });
    }

    // packages/dsh-plugin/src/client/components/CourseSetupCard.tsx
    var import_react6 = require("react");
    var import_jsx_runtime6 = require("react/jsx-runtime");
    function CourseSetupCard(props) {
      const { detail } = props;
      const goals = detail.activeRevision?.goals ?? detail.draftRevision?.goals ?? [];
      const busy = props.busy || props.phase === "loading";
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ai-course-setup", role: "region", "aria-label": "\u8BFE\u7A0B\u7ED3\u6784\u5F85\u786E\u8BA4", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ai-course-setup-card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ai-row", style: { alignItems: "baseline", gap: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { style: { margin: 0, fontSize: 16 }, children: detail.course.title }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "ai-badge", children: "\u8BFE\u7A0B\u7ED3\u6784\u5F85\u786E\u8BA4" })
        ] }),
        goals.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ai-muted", style: { marginTop: 4 }, children: [
          "\u5B66\u4E60\u76EE\u6807\uFF1A",
          goals.join("\uFF1B")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "ai-muted", style: { margin: "8px 0 10px" }, children: "\u8FD9\u95E8\u8BFE\u7A0B\u8FD8\u6CA1\u6709\u786E\u8BA4\u7684\u8BFE\u7A0B\u7ED3\u6784\uFF0C\u7CFB\u7EDF\u5B66\u4E60\u4E0E\u7EC3\u4E60\u9700\u8981\u5148\u786E\u8BA4\u6982\u5FF5\u4E0E\u5B66\u4E60\u987A\u5E8F\uFF1B \u4E5F\u53EF\u4EE5\u76F4\u63A5\u300C\u5148\u968F\u4FBF\u95EE\u95EE\u300D\u7528\u6700\u5C0F\u7ED3\u6784\u5F00\u59CB\uFF0C\u4E4B\u540E\u518D\u8865\u5168\u3002" }),
        props.error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ai-banner", "data-kind": "error", role: "alert", style: { marginBottom: 10, borderRadius: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: props.error }) }),
        props.phase === "loading" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Spinner, { label: "\u6B63\u5728\u751F\u6210/\u8BFB\u53D6\u8BFE\u7A0B\u7ED3\u6784\u2026\uFF08\u6A21\u578B\u5206\u6790\u8D44\u6599\u53EF\u80FD\u9700\u8981\u51E0\u5341\u79D2\uFF09" }),
        props.phase === "draft" && props.draft !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          DraftReview,
          {
            draft: props.draft,
            busy: props.busy,
            error: props.error,
            onConfirm: () => props.onConfirm(props.draft?.revision.id ?? ""),
            onRegenerate: props.onGenerate,
            onAdhoc: props.onAdhoc
          }
        ),
        props.phase !== "draft" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
          props.phase !== "loading" && props.hasDraftConcepts && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ai-row", style: { marginBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "ai-primary-button", disabled: busy, onClick: props.onLoadDraft, children: "\u67E5\u770B\u5E76\u786E\u8BA4\u8349\u6848" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "ai-small-button", disabled: busy, onClick: props.onGenerate, children: "\u91CD\u65B0\u751F\u6210\u8349\u6848" })
          ] }),
          props.phase !== "loading" && !props.hasDraftConcepts && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ai-row", style: { marginBottom: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "ai-primary-button", disabled: busy, onClick: props.onGenerate, children: "\u751F\u6210\u8BFE\u7A0B\u8349\u6848" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "ai-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "ai-small-button", disabled: busy, onClick: props.onAdhoc, children: "\u5148\u968F\u4FBF\u95EE\u95EE\uFF08\u968F\u95EE\u968F\u5B66\uFF09" }),
            props.phase === "error" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "ai-small-button", disabled: busy, onClick: props.onLoadDraft, children: "\u91CD\u8BD5\u8BFB\u53D6\u8349\u6848" })
          ] }),
          props.phase === "error" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "ai-muted", style: { marginTop: 6 }, children: "\u8349\u6848\u751F\u6210/\u8BFB\u53D6\u5931\u8D25\u65F6\u4F1A\u663E\u793A\u4E0A\u65B9\u9519\u8BEF\u539F\u56E0\uFF1B\u53EF\u91CD\u8BD5\uFF0C\u6216\u76F4\u63A5\u5148\u7528\u300C\u5148\u968F\u4FBF\u95EE\u95EE\u300D\u7EE7\u7EED\u3002" })
        ] })
      ] }) });
    }

    // packages/dsh-plugin/src/client/components/Sidebar.tsx
    var import_react7 = require("react");
    var import_jsx_runtime7 = require("react/jsx-runtime");
    function orderedConcepts(detail) {
      const revision = detail?.activeRevision ?? detail?.draftRevision;
      if (revision === void 0) return [];
      const byId = new Map(revision.concepts.map((concept) => [concept.id, concept]));
      const ordered = [];
      for (const conceptId of revision.sequence) {
        const concept = byId.get(conceptId);
        if (concept !== void 0) {
          ordered.push(concept);
          byId.delete(conceptId);
        }
      }
      ordered.push(...byId.values());
      return ordered;
    }
    function Sidebar(props) {
      const detail = props.courseDetail;
      const concepts = orderedConcepts(detail);
      const masteryByConcept = new Map(props.mastery.map((record) => [record.conceptId, record]));
      const currentConceptId = props.session?.session.position.conceptId;
      const activeCourseId = detail?.course.id ?? props.courses[0]?.course.id;
      const language = detail?.activeRevision?.language ?? detail?.draftRevision?.language ?? "zh";
      const goal = detail?.activeRevision?.goals[0] ?? detail?.draftRevision?.goals[0];
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("nav", { className: "ai-teaching-sidebar", "aria-label": "\u8BFE\u7A0B\u5BFC\u822A", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-sidebar-section", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-sidebar-heading-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { className: "ai-sidebar-heading", children: "\u8BFE\u7A0B" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "button",
              {
                type: "button",
                className: "ai-small-button",
                onClick: () => props.onNewCourse(),
                disabled: props.busy,
                "aria-label": "\u65B0\u5EFA\u8BFE\u7A0B",
                title: "\u65B0\u5EFA\u8BFE\u7A0B",
                children: "\uFF0B \u65B0\u5EFA\u8BFE\u7A0B"
              }
            )
          ] }),
          props.courses.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ai-muted", children: "\u8FD8\u6CA1\u6709\u8BFE\u7A0B" }),
          props.courses.map((summary) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-course-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
              "button",
              {
                type: "button",
                className: "ai-course-button",
                "data-active": summary.course.id === activeCourseId,
                onClick: () => props.onSelectCourse(summary.course.id),
                "aria-label": `\u5207\u6362\u5230\u8BFE\u7A0B ${summary.course.title}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ai-course-title", children: summary.course.title }),
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "ai-course-meta", children: [
                    summary.sourceCount,
                    " \u4EFD\u8D44\u6599 \xB7 ",
                    summary.conceptCount,
                    " \u4E2A\u6982\u5FF5",
                    summary.lastSessionAt !== void 0 ? ` \xB7 ${formatDay(summary.lastSessionAt)}` : ""
                  ] }),
                  summary.course.id === activeCourseId && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ai-progress", "aria-label": `\u5B66\u4E60\u8FDB\u5EA6 ${props.progress.percent}%`, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: { width: `${props.progress.percent}%` } }) })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "button",
              {
                type: "button",
                className: "ai-course-delete",
                title: `\u5220\u9664\u8BFE\u7A0B ${summary.course.title}`,
                "aria-label": `\u5220\u9664\u8BFE\u7A0B ${summary.course.title}`,
                disabled: props.busy,
                onClick: () => props.onDeleteCourse(summary.course.id, summary.course.title),
                children: "\u{1F5D1}"
              }
            )
          ] }, summary.course.id)),
          detail !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-muted", style: { marginTop: 4 }, children: [
            language === "en" ? "English" : language === "bilingual" ? "\u4E2D\u82F1\u53CC\u8BED" : "\u4E2D\u6587",
            goal !== void 0 ? ` \xB7 \u76EE\u6807\uFF1A${truncate(goal, 24)}` : "",
            props.onEditGoals !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "button",
              {
                type: "button",
                className: "ai-link-button",
                style: { marginLeft: 6 },
                onClick: () => props.onEditGoals?.(),
                "aria-label": "\u7F16\u8F91\u5B66\u4E60\u76EE\u6807",
                title: "\u7F16\u8F91\u5B66\u4E60\u76EE\u6807\u4E0E\u57FA\u7840",
                children: "\u270F\uFE0F \u7F16\u8F91\u76EE\u6807"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-sidebar-section", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("h3", { className: "ai-sidebar-heading", children: [
            "\u6982\u5FF5\u8FDB\u5EA6\uFF08",
            props.progress.covered,
            "/",
            props.progress.total,
            "\uFF09"
          ] }),
          concepts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ai-muted", children: detail === void 0 ? "\u5C1A\u672A\u9009\u62E9\u8BFE\u7A0B" : "\u8BFE\u7A0B\u7ED3\u6784\u5C1A\u672A\u786E\u8BA4\uFF0C\u786E\u8BA4\u540E\u663E\u793A\u6982\u5FF5" }),
          concepts.map((concept) => {
            const record = masteryByConcept.get(concept.id);
            const level = record?.level ?? "unseen";
            const current = concept.id === currentConceptId;
            return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
              "button",
              {
                type: "button",
                className: "ai-concept-row",
                "data-current": current,
                onClick: () => props.onConceptClick(concept),
                title: concept.summary,
                "aria-label": `\u5B66\u4E60\u6982\u5FF5 ${concept.title}`,
                disabled: props.busy,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ai-grow", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: concept.title }),
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ai-badge", "data-level": level, children: MASTERY_LABELS[level] })
                ]
              },
              concept.id
            );
          }),
          props.session !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-muted", style: { marginTop: 4 }, children: [
            "\u5F53\u524D\u9636\u6BB5\uFF1A",
            STAGE_LABELS[props.session.session.position.stage]
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-sidebar-section", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { className: "ai-sidebar-heading", children: "\u5B66\u4E60\u4F1A\u8BDD" }),
          props.sessions.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ai-muted", children: "\u65B0\u5EFA\u4F1A\u8BDD\u5F00\u59CB\u5B66\u4E60" }),
          props.sessions.slice(0, 8).map((summary) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
            "button",
            {
              type: "button",
              className: "ai-session-row",
              "data-active": summary.id === props.session?.session.id,
              onClick: () => props.onSelectSession(summary.id),
              "aria-label": `\u6253\u5F00\u4F1A\u8BDD ${summary.title}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ai-session-title", children: summary.title }),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "ai-badge", children: STAGE_LABELS[summary.stage] })
              ]
            },
            summary.id
          )),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", className: "ai-link-button", onClick: props.onNewSession, disabled: props.busy, children: "+ \u65B0\u5EFA\u5B66\u4E60\u4F1A\u8BDD" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-sidebar-section", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { className: "ai-sidebar-heading", children: "\u590D\u4E60\u5EFA\u8BAE" }),
          props.review.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ai-muted", children: "\u6682\u65E0\u5230\u671F\u590D\u4E60" }),
          props.review.slice(0, 5).map((item) => {
            const concept = concepts.find((candidate) => candidate.id === item.conceptId);
            const mastery = masteryByConcept.get(item.conceptId);
            return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-review-item", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { children: concept?.title ?? "\u6982\u5FF5" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-review-reason", children: [
                REVIEW_REASON_LABELS[item.reason],
                " \xB7 \u95F4\u9694 ",
                item.intervalDays,
                " \u5929",
                mastery !== void 0 ? ` \xB7 ${MASTERY_LABELS[mastery.level]}` : ""
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "button",
                {
                  type: "button",
                  className: "ai-link-button",
                  onClick: () => props.onReviewConcept(item),
                  disabled: props.busy,
                  children: "\u5F00\u59CB\u590D\u4E60"
                }
              )
            ] }, item.conceptId);
          })
        ] }),
        detail !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "ai-sidebar-section", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { className: "ai-sidebar-heading", children: "\u8D44\u6599" }),
          detail.sources.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "ai-muted", children: "\u5C1A\u672A\u5BFC\u5165\u8D44\u6599" }),
          detail.sources.slice(0, 6).map((source) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
            "button",
            {
              type: "button",
              className: "ai-link-button",
              style: { display: "block" },
              onClick: () => props.onOpenSource(source.id),
              title: source.originalPath,
              children: [
                source.missing === true ? "\u26A0 " : "",
                truncate(source.title, 22)
              ]
            },
            source.id
          ))
        ] })
      ] });
    }

    // packages/dsh-plugin/src/client/components/TeachingArea.tsx
    var import_react8 = require("react");
    var import_jsx_runtime8 = require("react/jsx-runtime");
    function ActivityView(props) {
      const host = (0, import_react8.useRef)(null);
      const callbacksRef = (0, import_react8.useRef)(props.callbacks);
      callbacksRef.current = props.callbacks;
      const stateRef = (0, import_react8.useRef)(props.state);
      stateRef.current = props.state;
      const { activity } = props;
      (0, import_react8.useEffect)(() => {
        const element = host.current;
        if (element === null) return;
        element.textContent = "";
        const validation = validateActivityPayload(activity.payload);
        if (!validation.ok) {
          const error = document.createElement("div");
          error.className = "ai-banner";
          error.dataset.kind = "error";
          error.textContent = `\u6D3B\u52A8\u6570\u636E\u65E0\u6CD5\u6E32\u67D3\uFF1A${validation.error.message}`;
          element.appendChild(error);
          return;
        }
        const mounted = mountActivity(element, {
          payload: validation.value,
          id: activity.id,
          revision: activity.revision,
          title: activity.title,
          goal: activity.goal,
          sourceRefs: activity.sourceRefs,
          verification: activity.verification
        }, {
          ...stateRef.current !== void 0 ? { state: stateRef.current } : {},
          callbacks: {
            onStateChange: (patch) => callbacksRef.current.onStateChange(activity, patch),
            onRunCode: (request) => callbacksRef.current.onRunCode(activity, request),
            onCancelRun: (runId) => callbacksRef.current.onCancelRun(runId),
            onQuizSubmit: (selected) => callbacksRef.current.onQuizSubmit(activity, selected),
            onAnswerSubmit: (submission) => callbacksRef.current.onAnswerSubmit(activity, submission.answerText),
            onHelpExposure: (help) => callbacksRef.current.onHelpExposure(activity, help),
            onAnchorClick: (anchor) => callbacksRef.current.onAnchorClick(anchor)
          }
        });
        return () => {
          mounted.dispose();
          element.textContent = "";
        };
      }, [activity.id, activity.revision]);
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { ref: host });
    }
    function ActivityTab(props) {
      const selected = props.activities.find((activity) => activity.id === props.selectedActivityId) ?? props.activities[props.activities.length - 1];
      const sorted = [...props.activities].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
        sorted.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-activity-list", role: "tablist", "aria-label": "\u6559\u5B66\u6D3B\u52A8", children: sorted.map((activity) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "button",
          {
            type: "button",
            className: "ai-small-button",
            "data-active": activity.id === selected?.id,
            onClick: () => props.onSelectActivity(activity.id),
            title: activity.goal,
            children: truncate(activity.title, 18)
          },
          activity.id
        )) }),
        selected === void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-empty", children: "\u6559\u5B66\u533A\u57DF\u8FD8\u7A7A\u7740\u3002\u7EE7\u7EED\u5BF9\u8BDD\uFF0C\u6559\u5E08\u4F1A\u5728\u8FD9\u91CC\u521B\u5EFA\u53EF\u4EA4\u4E92\u7684\u6D3B\u52A8\u3001\u56FE\u5F62\u3001\u63A8\u5BFC\u6216\u4EE3\u7801\u5B9E\u9A8C\uFF1B\u8FFD\u95EE\u65F6\u5B83\u4F1A\u4FDD\u7559\u5E76\u53EF\u7EE7\u7EED\u64CD\u4F5C\u3002" }),
        selected !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            ActivityView,
            {
              activity: selected,
              ...props.activityStates[selected.id] !== void 0 ? { state: props.activityStates[selected.id] } : {},
              callbacks: props.callbacks
            },
            `${selected.id}:${selected.revision}`
          ),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-muted", style: { marginTop: 6 }, children: [
            "\u4FEE\u8BA2 v",
            selected.revision,
            " \xB7 \u66F4\u65B0\u4E8E ",
            selected.updatedAt.slice(11, 16),
            selected.status === "archived" ? " \xB7 \u5DF2\u5F52\u6863" : "",
            selected.revisionHistory !== void 0 && selected.revisionHistory.length > 0 ? ` \xB7 \u5386\u53F2 ${selected.revisionHistory.length} \u4E2A\u4FEE\u8BA2` : ""
          ] })
        ] })
      ] });
    }
    function SourcesTab(props) {
      const [view, setView] = (0, import_react8.useState)(void 0);
      const [loading, setLoading] = (0, import_react8.useState)(false);
      const [error, setError] = (0, import_react8.useState)(void 0);
      const documentId = props.selectedDocumentId;
      (0, import_react8.useEffect)(() => {
        if (documentId === void 0) {
          setView(void 0);
          return;
        }
        let disposed = false;
        setLoading(true);
        setError(void 0);
        void props.loadSource(documentId).then((loaded) => {
          if (!disposed) setView(loaded);
        }).catch((cause) => {
          if (!disposed) setError(cause instanceof Error ? cause.message : String(cause));
        }).finally(() => {
          if (!disposed) setLoading(false);
        });
        return () => {
          disposed = true;
        };
      }, [documentId, props.loadSource]);
      const sources = props.courseDetail?.sources ?? [];
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
        sources.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-empty", children: "\u8FD8\u6CA1\u6709\u5BFC\u5165\u8D44\u6599\u3002\u9996\u6B21\u4F7F\u7528\u5411\u5BFC\u6216\u8BFE\u7A0B\u8BBE\u7F6E\u4E2D\u53EF\u4EE5\u5BFC\u5165\u672C\u5730\u8D44\u6599\u3002" }),
        sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-source-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-source-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
              source.missing === true ? "\u26A0 " : "",
              source.title
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ai-badge", children: source.format }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ai-badge", children: source.status })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-source-meta", title: source.originalPath, children: truncate(source.originalPath, 70) }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-row", style: { marginTop: 4 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "ai-link-button", onClick: () => props.onOpenSource(source.id), children: "\u8BFB\u53D6\u5185\u5BB9" }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "ai-link-button", onClick: () => props.onRefreshSource(source.id), children: "\u68C0\u67E5\u539F\u6587\u4EF6\u53D8\u5316" })
          ] })
        ] }, source.id)),
        loading && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Spinner, { label: "\u8BFB\u53D6\u8D44\u6599\u2026" }),
        error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-banner", "data-kind": "error", role: "alert", children: [
          "\u8BFB\u53D6\u5931\u8D25\uFF1A",
          error
        ] }),
        view !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { marginTop: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: view.document.title }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "ai-muted", children: [
              "\u5171 ",
              view.totalUnits,
              " \u4E2A\u5355\u5143"
            ] })
          ] }),
          view.issues.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("ul", { className: "ai-warning-list", children: view.issues.slice(0, 6).map((issue, index) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("li", { className: "ai-source-issue", children: [
            "[",
            issue.severity,
            "] ",
            issue.message
          ] }, index)) }),
          view.revision?.units.slice(0, 40).map((unit) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-source-unit", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-muted", children: [
              unit.kind,
              " \xB7 ",
              unit.locator.page !== void 0 ? `\u7B2C ${unit.locator.page} \u9875` : unit.locator.lines !== void 0 ? `\u7B2C ${unit.locator.lines[0]}\u2013${unit.locator.lines[1]} \u884C` : "",
              " \xB7 \u7F6E\u4FE1\u5EA6 ",
              unit.confidence
            ] }),
            unit.text.length > 1200 ? `${unit.text.slice(0, 1200)}\u2026` : unit.text,
            unit.notes !== void 0 && unit.notes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-source-issue", children: unit.notes.join("\uFF1B") })
          ] }, unit.id)),
          view.revision === void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-empty", children: "\u8BE5\u8D44\u6599\u8FD8\u6CA1\u6709\u53EF\u8BFB\u4FEE\u8BA2\uFF08\u53EF\u80FD\u4ECD\u5728\u5904\u7406\u6216\u62BD\u53D6\u5931\u8D25\uFF09\u3002" })
        ] })
      ] });
    }
    function ExperimentsTab(props) {
      const codeActivities = props.activities.filter(
        (activity) => activity.payload.type === "code-run"
      );
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-row", style: { marginBottom: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: "\u5B9E\u9A8C\u73AF\u5883" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "ai-small-button", onClick: props.onLoadEnvironments, children: "\u5237\u65B0\u73AF\u5883\u72B6\u6001" })
        ] }),
        props.environments === void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-empty", children: "\u5C1A\u672A\u52A0\u8F7D\u73AF\u5883\u6E05\u5355\u3002\u70B9\u51FB\u201C\u5237\u65B0\u73AF\u5883\u72B6\u6001\u201D\u4ECE Host \u8BFB\u53D6\u771F\u5B9E\u89E3\u91CA\u5668\u7248\u672C\u4E0E\u9694\u79BB\u65B9\u5F0F\u3002" }),
        props.environments !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
          props.environments.supportedLanguages.map((row) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-env-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ai-badge", children: row.status }),
            " ",
            row.label,
            row.note !== void 0 ? ` \xB7 ${row.note}` : ""
          ] }, row.language)),
          props.environments.environments.map((record) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-env-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ai-badge", children: record.status }),
              " ",
              record.language,
              record.dialect !== void 0 ? `\uFF08${record.dialect}\uFF09` : "",
              record.version !== void 0 ? ` \xB7 ${record.version}` : ""
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-muted", children: [
              "\u4F9D\u8D56\uFF1A",
              record.isolation.dependencies,
              record.isolation.path !== void 0 ? ` \xB7 ${record.isolation.path}` : "",
              " \xB7 ",
              "\u6267\u884C\uFF1A",
              record.execution.mode,
              record.execution.executable !== void 0 ? ` \xB7 ${record.execution.executable}` : "",
              " \xB7 ",
              "\u8D85\u65F6 ",
              record.execution.timeoutMs,
              "ms",
              record.execution.network !== void 0 ? ` \xB7 \u7F51\u7EDC\uFF1A${record.execution.network}` : ""
            ] }),
            record.failure !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-source-issue", children: [
              "\u51C6\u5907\u5931\u8D25\uFF1A",
              record.failure.message,
              "\uFF08\u6E05\u7406\uFF1A",
              record.failure.cleanup,
              "\uFF09"
            ] })
          ] }, record.id)),
          props.environments.gaps.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("ul", { className: "ai-warning-list", children: props.environments.gaps.map((gap) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("li", { children: gap }, gap)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-row", style: { margin: "10px 0 6px" }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: "\u672C\u6B21\u4F1A\u8BDD\u7684\u4EE3\u7801\u5B9E\u9A8C" }) }),
        codeActivities.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-empty", children: "\u5F53\u524D\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u4EE3\u7801\u6D3B\u52A8\u3002" }),
        codeActivities.map((activity) => {
          const result = props.runResults[activity.id];
          return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-env-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
              activity.title,
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ai-badge", children: activity.payload.type === "code-run" ? activity.payload.language : "" })
            ] }),
            result === void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-muted", children: "\u5C1A\u672A\u8FD0\u884C\uFF1B\u5728\u201C\u5F53\u524D\u6D3B\u52A8\u201D\u4E2D\u8FD0\u884C\u540E\u8FD9\u91CC\u663E\u793A\u771F\u5B9E\u8F93\u51FA\u3002" }),
            result !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-muted", children: [
              "\u72B6\u6001\uFF1A",
              result.status,
              result.exitCode !== void 0 ? ` \xB7 \u9000\u51FA\u7801 ${result.exitCode}` : "",
              result.durationMs !== void 0 ? ` \xB7 ${result.durationMs}ms` : "",
              result.verification !== void 0 ? ` \xB7 \u6821\u9A8C\uFF1A${result.verification}` : "",
              result.runId !== void 0 ? ` \xB7 \u8FD0\u884C ${result.runId}` : ""
            ] }),
            result !== void 0 && result.stdout !== "" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("pre", { style: { maxHeight: 140, overflow: "auto", fontSize: 11 }, children: result.stdout }),
            result !== void 0 && result.stderr !== "" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("pre", { style: { maxHeight: 140, overflow: "auto", fontSize: 11, color: "var(--dsw-alias-state-error-primary, #b91c1c)" }, children: result.stderr })
          ] }, activity.id);
        })
      ] });
    }
    function NotesTab(props) {
      const selected = props.activities.find((activity) => activity.id === props.selectedActivityId);
      const stored = props.courseDetail?.learning.notes ?? [];
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-notes-area", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-muted", style: { marginBottom: 4 }, children: selected !== void 0 ? `\u7B14\u8BB0\u7ED1\u5B9A\u5230\u5F53\u524D\u6D3B\u52A8\u300C${selected.title}\u300D\uFF0C\u968F\u6D3B\u52A8\u72B6\u6001\u4FDD\u5B58\u5230 Host\u3002` : "\u9009\u62E9\u4E00\u4E2A\u6D3B\u52A8\u540E\u53EF\u8BB0\u5F55\u7B14\u8BB0\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "textarea",
          {
            value: props.notes,
            "aria-label": "\u6D3B\u52A8\u7B14\u8BB0",
            placeholder: "\u8BB0\u5F55\u4F60\u7684\u7406\u89E3\u3001\u7591\u95EE\u6216\u5B9E\u9A8C\u89C2\u5BDF\u2026",
            onChange: (event) => props.onNotesChange(event.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-row", style: { marginTop: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            "button",
            {
              type: "button",
              className: "ai-primary-button",
              disabled: props.busy || selected === void 0,
              onClick: props.onSaveNotes,
              children: "\u4FDD\u5B58\u7B14\u8BB0"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ai-muted", children: "\u7B14\u8BB0\u53EA\u4FDD\u5B58\u5728\u672C\u673A Host \u6570\u636E\u76EE\u5F55\u3002" })
        ] }),
        stored.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { marginTop: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-sidebar-heading", children: [
            "\u8BFE\u7A0B\u7B14\u8BB0\u5386\u53F2\uFF08",
            stored.length,
            "\uFF09"
          ] }),
          stored.slice(0, 10).map((note) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-source-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("pre", { style: { whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }, children: note.markdown }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-muted", children: note.updatedAt.slice(0, 16).replace("T", " ") })
          ] }, note.id))
        ] })
      ] });
    }
    function TeachingArea(props) {
      const tab = props.selectedTab;
      const callbacks = {
        onStateChange: props.onStateChange,
        onRunCode: props.onRunCode,
        onCancelRun: props.onCancelRun,
        onQuizSubmit: props.onQuizSubmit,
        onAnswerSubmit: props.onAnswerSubmit,
        onHelpExposure: props.onHelpExposure,
        onAnchorClick: props.onAnchorClick
      };
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("section", { className: "ai-teaching-area", "aria-label": "\u6301\u7EED\u6559\u5B66\u533A\u57DF", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ai-tabs", role: "tablist", children: [
          ["activity", "\u5F53\u524D\u6D3B\u52A8"],
          ["sources", "\u6765\u6E90"],
          ["experiments", "\u5B9E\u9A8C/\u8FD0\u884C\u7ED3\u679C"],
          ["notes", "\u7B14\u8BB0"]
        ].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
          "button",
          {
            type: "button",
            className: "ai-tab",
            role: "tab",
            "aria-selected": tab === key,
            "data-active": tab === key,
            onClick: () => props.onSelectTab(key),
            children: [
              label,
              key === "activity" && props.activities.length > 0 ? ` (${props.activities.length})` : ""
            ]
          },
          key
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ai-tab-body", children: [
          tab === "activity" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            ActivityTab,
            {
              activities: props.activities,
              ...props.selectedActivityId !== void 0 ? { selectedActivityId: props.selectedActivityId } : {},
              activityStates: props.activityStates,
              callbacks,
              onSelectActivity: props.onSelectActivity
            }
          ),
          tab === "sources" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            SourcesTab,
            {
              ...props.courseDetail !== void 0 ? { courseDetail: props.courseDetail } : {},
              ...props.selectedDocumentId !== void 0 ? { selectedDocumentId: props.selectedDocumentId } : {},
              loadSource: props.loadSource,
              onOpenSource: props.onOpenSource,
              onRefreshSource: props.onRefreshSource
            }
          ),
          tab === "experiments" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            ExperimentsTab,
            {
              ...props.environments !== void 0 ? { environments: props.environments } : {},
              activities: props.activities,
              runResults: props.runResults,
              onLoadEnvironments: props.onLoadEnvironments
            }
          ),
          tab === "notes" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            NotesTab,
            {
              activities: props.activities,
              ...props.selectedActivityId !== void 0 ? { selectedActivityId: props.selectedActivityId } : {},
              notes: props.notes,
              busy: props.busy,
              ...props.courseDetail !== void 0 ? { courseDetail: props.courseDetail } : {},
              onNotesChange: props.onNotesChange,
              onSaveNotes: props.onSaveNotes
            }
          )
        ] })
      ] });
    }

    // packages/dsh-plugin/src/client/components/TopBar.tsx
    var import_react9 = require("react");
    var import_jsx_runtime9 = require("react/jsx-runtime");
    function TopBar(props) {
      const model = props.bootstrap?.model;
      const imageCapability = model?.imageInput === "yes" ? "\u53EF\u8BFB\u56FE" : model?.imageInput === "no" ? "\u4E0D\u53EF\u8BFB\u56FE" : "\u56FE\u50CF\u80FD\u529B\u672A\u77E5";
      return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("header", { className: "ai-teaching-topbar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h2", { className: "ai-topbar-title", children: props.courseTitle ?? "AI \u77E5\u8BC6\u5E93\u6559\u5B66" }),
            props.goals.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "ai-topbar-goal", title: props.goals.join("\uFF1B"), children: [
              "\u76EE\u6807\uFF1A",
              props.goals.join("\uFF1B")
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "ai-topbar-meta", children: [
            props.offline && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "ai-badge", style: { color: "var(--dsw-alias-state-warn-primary, #b45309)", borderColor: "var(--dsw-alias-state-warn-primary, #d97706)" }, children: "\u79BB\u7EBF" }),
            model !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { title: `\u6A21\u578B\uFF1A${model.provider}/${model.model}\uFF1B${imageCapability}${model.note !== void 0 ? `\uFF1B${model.note}` : ""}`, children: [
              "\u6A21\u578B ",
              model.model,
              " \xB7 ",
              imageCapability
            ] }),
            props.bootstrap !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { title: `Host ${props.bootstrap.host.platform}-${props.bootstrap.host.arch} \xB7 Node ${props.bootstrap.host.nodeVersion} \xB7 \u6570\u636E\u76EE\u5F55 ${props.bootstrap.dataDir}`, children: [
              "v",
              props.bootstrap.pluginVersion
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "ai-lang-switch", role: "group", "aria-label": "\u8BB2\u89E3\u8BED\u8A00", children: Object.keys(LANGUAGE_LABELS).map((language) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              "button",
              {
                type: "button",
                "data-active": props.language === language,
                disabled: props.busy,
                onClick: () => props.onLanguage(language),
                "aria-label": `\u5207\u6362\u4E3A ${LANGUAGE_LABELS[language]}`,
                children: LANGUAGE_LABELS[language]
              },
              language
            )) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(TaskProgressBar, { tasks: props.tasks, onCancel: props.onCancelTask }),
        props.bootstrap !== void 0 && props.bootstrap.warnings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "ai-banner", "data-kind": "warning", role: "status", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { children: [
          "\u80FD\u529B\u63D0\u793A\uFF1A",
          props.bootstrap.warnings.join("\uFF1B")
        ] }) })
      ] });
    }

    // packages/dsh-plugin/src/client/components/Workspace.tsx
    var import_jsx_runtime10 = require("react/jsx-runtime");
    function activityPrompt(activity) {
      const payload = activity.payload;
      switch (payload.type) {
        case "quiz":
          return payload.question;
        case "proof-task":
          return payload.claim;
        case "open-question":
          return payload.prompt;
        case "reading-task":
          return payload.instructions;
        case "code-run":
          return payload.instructions ?? activity.title;
        case "derivation":
          return payload.claim ?? activity.title;
        case "explanation":
          return payload.title ?? activity.title;
        case "experiment-note":
          return payload.title;
        case "graph":
        case "figure":
          return payload.title ?? activity.title;
        default:
          return activity.title;
      }
    }
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    function TeachingWorkspace(props = {}) {
      const [state, dispatch] = import_react10.default.useReducer(workspaceReducer, INITIAL_WORKSPACE_STATE);
      const stateRef = (0, import_react10.useRef)(state);
      stateRef.current = state;
      const streamAbort = (0, import_react10.useRef)(null);
      const mounted = (0, import_react10.useRef)(true);
      const pollTimer = (0, import_react10.useRef)(void 0);
      const helpByActivity = (0, import_react10.useRef)({});
      const activeRuns = (0, import_react10.useRef)({});
      const saveTimers = (0, import_react10.useRef)({});
      const [online, setOnline] = (0, import_react10.useState)(() => typeof navigator === "undefined" ? true : navigator.onLine !== false);
      const [runResults, setRunResults] = (0, import_react10.useState)({});
      const [deleteTarget, setDeleteTarget] = (0, import_react10.useState)(void 0);
      const [goalsEditor, setGoalsEditor] = (0, import_react10.useState)(void 0);
      const [savingGoals, setSavingGoals] = (0, import_react10.useState)(false);
      const [deleteSources, setDeleteSources] = (0, import_react10.useState)(false);
      const [deleting, setDeleting] = (0, import_react10.useState)(false);
      const [notesDraft, setNotesDraft] = (0, import_react10.useState)("");
      const [setup, setSetup] = (0, import_react10.useState)({ phase: "ready" });
      (0, import_react10.useEffect)(() => {
        mounted.current = true;
        const update = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine !== false);
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        void bootstrap();
        return () => {
          mounted.current = false;
          window.removeEventListener("online", update);
          window.removeEventListener("offline", update);
          if (pollTimer.current !== void 0) clearTimeout(pollTimer.current);
          for (const timer of Object.values(saveTimers.current)) clearTimeout(timer);
          streamAbort.current?.abort();
        };
      }, []);
      (0, import_react10.useEffect)(() => {
        setSetup({ phase: "ready" });
      }, [state.courseDetail?.course.id]);
      (0, import_react10.useEffect)(() => {
        const activityId = state.selectedActivityId;
        if (activityId === void 0) {
          setNotesDraft("");
          return;
        }
        setNotesDraft(state.activityStates[activityId]?.notes ?? "");
      }, [state.selectedActivityId, state.session?.session.id]);
      const notify = (0, import_react10.useCallback)((notice) => {
        dispatch({ type: "notice", notice });
      }, []);
      const bootstrap = (0, import_react10.useCallback)(async () => {
        dispatch({ type: "workspace/loading" });
        try {
          const bootstrapInfo = await apiGet("bootstrap");
          const { courses } = await apiGet("courses.list");
          if (!mounted.current) return;
          dispatch({ type: "bootstrap/loaded", bootstrap: bootstrapInfo, courses });
          const firstCourse = courses[0];
          if (firstCourse !== void 0) {
            await selectCourse(firstCourse.course.id);
          }
        } catch (error) {
          if (mounted.current) dispatch({ type: "bootstrap/failed", error: toAppError(error) });
        }
      }, []);
      const selectCourse = (0, import_react10.useCallback)(async (courseId) => {
        try {
          const [detail2, sessionsResponse] = await Promise.all([
            apiGet("courses.get", { courseId }),
            apiGet("sessions.list", { courseId })
          ]);
          if (!mounted.current) return;
          dispatch({ type: "course/loaded", detail: detail2, sessions: sessionsResponse.sessions });
          if (sessionsResponse.sessions.length > 0) {
            await selectSession(sessionsResponse.sessions[0]?.id);
          } else {
            await createSession(courseId);
          }
          void loadTasks();
        } catch (error) {
          notify({ kind: "error", message: `\u52A0\u8F7D\u8BFE\u7A0B\u5931\u8D25\uFF1A${describeError(error)}`, ...error instanceof Error ? {} : {} });
        }
      }, [notify]);
      const confirmDeleteCourse = (0, import_react10.useCallback)(async () => {
        if (deleteTarget === void 0) return;
        setDeleting(true);
        try {
          const result = await apiPost("courses.delete", {
            courseId: deleteTarget.id,
            deleteSources
          });
          const { courses } = await apiGet("courses.list");
          dispatch({ type: "courses/loaded", courses });
          const wasActive = state.courseDetail?.course.id === deleteTarget.id;
          if (wasActive) {
            dispatch({ type: "course/cleared" });
            dispatch({ type: "session/cleared" });
            const next = courses[0];
            if (next !== void 0) await selectCourse(next.course.id);
          }
          const details = result.details;
          notify({
            kind: "info",
            message: `\u5DF2\u5220\u9664\u8BFE\u7A0B\u300C${deleteTarget.title}\u300D${details === void 0 ? "" : `\uFF08\u4F1A\u8BDD ${details.sessions}\u3001\u6D3B\u52A8 ${details.activities}\u3001\u89E3\u9664\u8D44\u6599\u5173\u8054 ${details.sourcesDetached}\u3001\u5220\u9664\u89E3\u6790\u8BB0\u5F55 ${details.sourcesDeleted}\uFF1B\u539F\u6587\u4EF6\u672A\u6539\u52A8\uFF09`}\u3002`
          });
          setDeleteTarget(void 0);
          setDeleteSources(false);
        } catch (error) {
          notify({ kind: "error", message: `\u5220\u9664\u8BFE\u7A0B\u5931\u8D25\uFF1A${describeError(error)}` });
        } finally {
          setDeleting(false);
        }
      }, [deleteTarget, deleteSources, state.courseDetail, selectCourse, notify]);
      const selectSession = (0, import_react10.useCallback)(async (sessionId) => {
        try {
          const view = await apiGet("sessions.get", { sessionId });
          if (!mounted.current) return;
          dispatch({ type: "session/loaded", session: view });
        } catch (error) {
          notify({ kind: "error", message: `\u6062\u590D\u5B66\u4E60\u4F1A\u8BDD\u5931\u8D25\uFF1A${describeError(error)}` });
        }
      }, [notify]);
      const createSession = (0, import_react10.useCallback)(async (courseId) => {
        try {
          await apiPost("sessions.create", { courseId });
          const { sessions } = await apiGet("sessions.list", { courseId });
          if (!mounted.current) return;
          dispatch({ type: "sessions/loaded", sessions });
          const newest = sessions[0];
          if (newest !== void 0) await selectSession(newest.id);
        } catch (error) {
          notify({ kind: "error", message: `\u521B\u5EFA\u5B66\u4E60\u4F1A\u8BDD\u5931\u8D25\uFF1A${describeError(error)}` });
        }
      }, [notify]);
      const loadTasks = (0, import_react10.useCallback)(async () => {
        try {
          const { tasks } = await apiGet("tasks.list");
          if (!mounted.current) return tasks;
          dispatch({ type: "tasks/loaded", tasks });
          const running = tasks.some((task) => task.status === "running" || task.status === "queued");
          if (running && pollTimer.current === void 0) {
            pollTimer.current = setTimeout(() => {
              pollTimer.current = void 0;
              void loadTasks();
            }, 1500);
          }
          return tasks;
        } catch {
          return [];
        }
      }, []);
      const awaitTask = (0, import_react10.useCallback)(async (taskId, timeoutMs = 12e4) => {
        const started = Date.now();
        for (; ; ) {
          if (!mounted.current || Date.now() - started > timeoutMs) return void 0;
          try {
            const { task } = await apiGet("tasks.get", { taskId });
            if (task.status !== "running" && task.status !== "queued") return task;
          } catch {
            return void 0;
          }
          await sleep(800);
        }
      }, []);
      const cancelTask = (0, import_react10.useCallback)(async (taskId) => {
        try {
          await apiPost("tasks.cancel", { taskId });
          await loadTasks();
          notify({ kind: "info", message: "\u5DF2\u8BF7\u6C42\u53D6\u6D88\u4EFB\u52A1\u3002" });
        } catch (error) {
          notify({ kind: "error", message: `\u53D6\u6D88\u5931\u8D25\uFF1A${describeError(error)}` });
        }
      }, [loadTasks, notify]);
      const sendMessage = (0, import_react10.useCallback)(async (text2) => {
        const current = stateRef.current;
        if (current.session === void 0) {
          notify({ kind: "warning", message: "\u8FD8\u6CA1\u6709\u5B66\u4E60\u4F1A\u8BDD\uFF1A\u8BF7\u5148\u5EFA\u7ACB\u8BFE\u7A0B\u6216\u65B0\u5EFA\u4F1A\u8BDD\u3002" });
          return;
        }
        if (isChatBusy(current)) return;
        const sessionId = current.session.session.id;
        if (!online) {
          notify({ kind: "warning", message: "\u5F53\u524D\u79BB\u7EBF\uFF1A\u5DF2\u4FDD\u7559\u5BF9\u8BDD\u4E0E\u6559\u5B66\u533A\u57DF\u5185\u5BB9\uFF0C\u6062\u590D\u8FDE\u63A5\u540E\u53EF\u7EE7\u7EED\u63D0\u95EE\u3002" });
          return;
        }
        const controller = new AbortController();
        streamAbort.current = controller;
        try {
          const response = await apiChatSend(sessionId, text2, controller.signal);
          await consumeChatStreamResponse(response, {
            onEvent: (event) => {
              if (!mounted.current) return;
              dispatch({ type: "chat/stream-event", event });
              if (event.type === "done") {
                void refreshLearning(sessionId);
              }
            },
            onProtocolError: (failure) => dispatch({ type: "chat/local-error", error: failure.appError })
          });
        } catch (error) {
          if (!mounted.current) return;
          if (controller.signal.aborted || error instanceof Error && error.name === "AbortError") {
            dispatch({
              type: "chat/stream-event",
              event: { type: "error", error: { code: "cancelled", message: "\u5DF2\u505C\u6B62\u751F\u6210" } }
            });
          } else {
            dispatch({ type: "chat/local-error", error: toAppError(error) });
            if (isNetworkError(error)) notify({ kind: "warning", message: "\u4E0E Host \u7684\u8FDE\u63A5\u4E2D\u65AD\uFF1A\u5DF2\u4FDD\u7559\u73B0\u6709\u5185\u5BB9\uFF0C\u6062\u590D\u540E\u53EF\u91CD\u8BD5\u3002" });
          }
        } finally {
          streamAbort.current = null;
        }
      }, [online, notify]);
      const refreshLearning = (0, import_react10.useCallback)(async (sessionId) => {
        try {
          const view = await apiGet("sessions.get", { sessionId });
          if (!mounted.current) return;
          dispatch({ type: "learning/updated", mastery: view.mastery, review: view.review });
        } catch {
        }
      }, []);
      const stopGeneration = (0, import_react10.useCallback)(async () => {
        const session = stateRef.current.session;
        if (session === void 0) return;
        dispatch({ type: "chat/cancel-requested" });
        try {
          await apiPost("chat.cancel", { sessionId: session.session.id });
        } catch (error) {
          streamAbort.current?.abort();
          dispatch({ type: "chat/local-error", error: toAppError(error) });
        }
      }, []);
      const retryLast = (0, import_react10.useCallback)(() => {
        const messages = stateRef.current.messages;
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          const message = messages[index];
          if (message?.role === "student") {
            dispatch({ type: "error/clear" });
            void sendMessage(message.text);
            return;
          }
        }
        notify({ kind: "info", message: "\u6CA1\u6709\u53EF\u91CD\u8BD5\u7684\u5B66\u751F\u63D0\u95EE\u3002" });
      }, [sendMessage, notify]);
      const quickAction = (0, import_react10.useCallback)((action) => {
        void sendMessage(QUICK_ACTION_PROMPTS[action]);
      }, [sendMessage]);
      const persistActivityState = (0, import_react10.useCallback)((activity, patch) => {
        const previous = stateRef.current.activityStates[activity.id];
        const next = {
          activityId: activity.id,
          activityRevision: activity.revision,
          ...patch.params !== void 0 ? { params: patch.params } : {},
          ...previous?.params !== void 0 && patch.params === void 0 ? { params: previous.params } : {},
          ...patch.code !== void 0 ? { code: patch.code } : previous?.code !== void 0 ? { code: previous.code } : {},
          ...patch.revealedStepIds !== void 0 ? { revealedStepIds: patch.revealedStepIds } : previous?.revealedStepIds !== void 0 ? { revealedStepIds: previous.revealedStepIds } : {},
          ...previous?.notes !== void 0 ? { notes: previous.notes } : {},
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        dispatch({ type: "activity/state", state: next });
        const Send = () => {
          const body = {
            activityId: activity.id,
            activityRevision: activity.revision
          };
          if (next.params !== void 0) body.params = next.params;
          if (next.code !== void 0) body.code = next.code;
          if (next.revealedStepIds !== void 0) body.revealedStepIds = next.revealedStepIds;
          if (next.notes !== void 0) body.notes = next.notes;
          apiPost("activity.state", body).then((response) => {
            const persisted = response.state;
            if (persisted !== void 0 && mounted.current) {
              dispatch({ type: "activity/state", state: persisted });
            }
          }).catch((error) => {
            notify({ kind: "warning", message: `\u6D3B\u52A8\u72B6\u6001\u672A\u4FDD\u5B58\uFF1A${describeError(error)}\uFF08\u672C\u5730\u4ECD\u53EF\u7EE7\u7EED\u64CD\u4F5C\uFF09` });
          });
        };
        const existing = saveTimers.current[activity.id];
        if (existing !== void 0) clearTimeout(existing);
        saveTimers.current[activity.id] = setTimeout(() => {
          delete saveTimers.current[activity.id];
          Send();
        }, 350);
      }, [notify]);
      const onRunCode = (0, import_react10.useCallback)(async (activity, request) => {
        const clientRunId = request.clientRunId;
        activeRuns.current[clientRunId] = { activityId: activity.id };
        try {
          const { run } = await apiPost("activity.run", {
            activityId: activity.id,
            activityRevision: activity.revision,
            code: request.code,
            // Addresses the in-flight run with /experiments.cancel; the Host uses it
            // as the real run id.
            clientRunId
          });
          const view = {
            runId: run.id,
            status: run.status,
            stdout: run.stdout,
            stderr: run.stderr,
            ...run.exitCode !== void 0 ? { exitCode: run.exitCode } : {},
            ...run.durationMs !== void 0 ? { durationMs: run.durationMs } : {},
            ...run.checks !== void 0 ? { checks: run.checks } : {},
            verification: run.verification,
            ...run.resourceNote !== void 0 ? { resourceNote: run.resourceNote } : {}
          };
          if (mounted.current) setRunResults((previous) => ({ ...previous, [activity.id]: view }));
          return view;
        } catch (error) {
          const view = {
            status: "failed",
            stdout: "",
            stderr: "",
            errorMessage: `\u8FD0\u884C\u672A\u5F00\u59CB\uFF1A${describeError(error)}`
          };
          if (mounted.current) setRunResults((previous) => ({ ...previous, [activity.id]: view }));
          return view;
        } finally {
          delete activeRuns.current[clientRunId];
        }
      }, []);
      const onCancelRun = (0, import_react10.useCallback)((runId) => {
        const target = runId ?? Object.keys(activeRuns.current)[0];
        if (target === void 0) {
          notify({ kind: "info", message: "\u5F53\u524D\u6CA1\u6709\u53EF\u53D6\u6D88\u7684\u8FD0\u884C\u3002" });
          return;
        }
        notify({ kind: "info", message: "\u6B63\u5728\u505C\u6B62\u8FD0\u884C\u2026" });
        void apiPost("experiments.cancel", { runId: target }).then(({ run }) => {
          if (!mounted.current) return;
          if (run.status === "cancelled") {
            notify({ kind: "info", message: "\u5DF2\u53D6\u6D88\u8FD0\u884C\uFF1B\u8FDB\u7A0B\u5DF2\u7ED3\u675F\uFF0C\u7ED3\u679C\u6807\u8BB0\u4E3A cancelled\u3002" });
          } else if (run.status === "running") {
            notify({ kind: "info", message: "\u5DF2\u8BF7\u6C42\u53D6\u6D88\uFF0C\u8FD0\u884C\u4ECD\u5728\u6536\u5C3E\u3002" });
          } else {
            notify({ kind: "info", message: `\u8FD0\u884C\u5DF2\u7ED3\u675F\uFF1A${run.status}` });
          }
        }).catch((error) => notify({ kind: "warning", message: `\u53D6\u6D88\u8FD0\u884C\u5931\u8D25\uFF1A${describeError(error)}` }));
      }, [notify]);
      const onHelpExposure = (0, import_react10.useCallback)((activity, help) => {
        const previous = helpByActivity.current[activity.id];
        const merged = {
          level: help.level,
          hintsSeen: [.../* @__PURE__ */ new Set([...previous?.hintsSeen ?? [], ...help.hintsSeen ?? [], ...help.answer !== void 0 ? [help.answer] : []])],
          ...help.answer !== void 0 ? { answer: help.answer } : previous?.answer !== void 0 ? { answer: previous.answer } : {}
        };
        helpByActivity.current[activity.id] = merged;
        if (help.level === "full-answer") {
          notify({ kind: "info", message: "\u5DF2\u5C55\u793A\u5B8C\u6574\u7B54\u6848\uFF1A\u672C\u6B21\u4F5C\u7B54\u4F1A\u5982\u5B9E\u8BB0\u5F55\u4E3A\u201C\u770B\u7B54\u6848\u201D\uFF0C\u4E0D\u8BA1\u4E3A\u72EC\u7ACB\u5B8C\u6210\u3002" });
        } else if (help.level >= 1) {
          notify({ kind: "info", message: "\u5DF2\u4F7F\u7528\u63D0\u793A\uFF1A\u672C\u6B21\u4F5C\u7B54\u4F1A\u5982\u5B9E\u8BB0\u5F55\u4E3A\u201C\u6709\u63D0\u793A\u201D\u3002" });
        }
      }, [notify]);
      const submitAttempt = (0, import_react10.useCallback)(async (activity, data) => {
        const session = stateRef.current.session;
        if (session === void 0) return;
        const help = helpByActivity.current[activity.id];
        const level = help?.level ?? 0;
        dispatch({ type: "busy", label: "\u63D0\u4EA4\u56DE\u7B54\u2026" });
        try {
          const outcome = await apiPost("attempts.submit", {
            sessionId: session.session.id,
            activityId: activity.id,
            activityRevision: activity.revision,
            prompt: activityPrompt(activity),
            answerText: data.answerText,
            helpLevel: level,
            ...help?.hintsSeen !== void 0 && help.hintsSeen.length > 0 ? { hintsSeen: help.hintsSeen } : {},
            answerRevealed: level === "full-answer",
            ...data.selectedOptionIds !== void 0 ? { selectedOptionIds: data.selectedOptionIds } : {},
            ...data.runId !== void 0 ? { runId: data.runId } : {}
          });
          if (!mounted.current) return;
          dispatch({ type: "learning/updated", mastery: outcome.mastery, review: outcome.review });
          const note = outcome.independenceNote !== void 0 ? `\u5DF2\u8BB0\u5F55\u5C1D\u8BD5\uFF08${outcome.attempt.independence}\uFF09\uFF1A${outcome.independenceNote}` : `\u5DF2\u8BB0\u5F55\u5C1D\u8BD5\uFF08${outcome.attempt.independence}\uFF09${outcome.validation.passed === void 0 ? "" : outcome.validation.passed ? "\uFF0C\u5BA2\u89C2\u68C0\u67E5\u901A\u8FC7" : "\uFF0C\u5BA2\u89C2\u68C0\u67E5\u672A\u901A\u8FC7"}\u3002`;
          notify({ kind: "info", message: note });
        } catch (error) {
          notify({ kind: "error", message: `\u63D0\u4EA4\u56DE\u7B54\u5931\u8D25\uFF1A${describeError(error)}` });
        } finally {
          if (mounted.current) dispatch({ type: "busy", label: void 0 });
        }
      }, [notify]);
      const onQuizSubmit = (0, import_react10.useCallback)((activity, selected) => {
        const payload = activity.payload;
        const labels = payload.type === "quiz" ? selected.map((id) => payload.options.find((option) => option.id === id)?.label ?? id) : selected;
        void submitAttempt(activity, { answerText: labels.join("\uFF1B"), selectedOptionIds: selected });
      }, [submitAttempt]);
      const onAnswerSubmit = (0, import_react10.useCallback)((activity, answerText) => {
        void submitAttempt(activity, { answerText });
      }, [submitAttempt]);
      const saveNotes = (0, import_react10.useCallback)(() => {
        const activity = selectedActivity(stateRef.current);
        if (activity === void 0) {
          notify({ kind: "warning", message: "\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u6D3B\u52A8\u518D\u4FDD\u5B58\u7B14\u8BB0\u3002" });
          return;
        }
        const next = {
          activityId: activity.id,
          activityRevision: activity.revision,
          ...stateRef.current.activityStates[activity.id]?.params !== void 0 ? { params: stateRef.current.activityStates[activity.id]?.params } : {},
          ...stateRef.current.activityStates[activity.id]?.code !== void 0 ? { code: stateRef.current.activityStates[activity.id]?.code } : {},
          ...stateRef.current.activityStates[activity.id]?.revealedStepIds !== void 0 ? { revealedStepIds: stateRef.current.activityStates[activity.id]?.revealedStepIds } : {},
          notes: notesDraft,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        dispatch({ type: "activity/state", state: next });
        void apiPost("activity.state", {
          activityId: activity.id,
          activityRevision: activity.revision,
          ...next.params !== void 0 ? { params: next.params } : {},
          ...next.code !== void 0 ? { code: next.code } : {},
          ...next.revealedStepIds !== void 0 ? { revealedStepIds: next.revealedStepIds } : {},
          notes: notesDraft
        }).then((response) => {
          if (mounted.current) dispatch({ type: "activity/state", state: response.state });
          notify({ kind: "info", message: "\u7B14\u8BB0\u5DF2\u4FDD\u5B58\u5230\u672C\u673A Host\u3002" });
        }).catch((error) => {
          notify({ kind: "error", message: `\u7B14\u8BB0\u4FDD\u5B58\u5931\u8D25\uFF1A${describeError(error)}` });
        });
      }, [notesDraft, notify]);
      const loadSource = (0, import_react10.useCallback)(async (documentId, offset, limit) => {
        return await apiGet("sources.get", {
          documentId,
          ...offset !== void 0 ? { offset } : {},
          ...limit !== void 0 ? { limit } : {}
        });
      }, []);
      const refreshSource = (0, import_react10.useCallback)(async (documentId) => {
        try {
          const { task } = await apiPost("sources.refresh", { documentId });
          notify({ kind: "info", message: `\u6B63\u5728\u68C0\u67E5\u8D44\u6599\u53D8\u5316\uFF1A${task.snapshot.label}` });
          void loadTasks();
          const settled = awaitTask(task.id);
          const snapshot = await settled;
          if (snapshot?.status === "completed") notify({ kind: "info", message: "\u8D44\u6599\u68C0\u67E5\u5B8C\u6210\uFF1B\u7ED3\u6784\u53D8\u5316\u4F1A\u663E\u793A\u5F85\u786E\u8BA4\u63D0\u793A\u3002" });
          else if (snapshot?.status === "failed") notify({ kind: "error", message: `\u8D44\u6599\u68C0\u67E5\u5931\u8D25\uFF1A${snapshot.error?.message ?? "\u672A\u77E5\u539F\u56E0"}` });
          void bootstrap();
        } catch (error) {
          notify({ kind: "error", message: `\u8D44\u6599\u5237\u65B0\u5931\u8D25\uFF1A${describeError(error)}` });
        }
      }, [notify, loadTasks, awaitTask]);
      const loadEnvironments = (0, import_react10.useCallback)(() => {
        void apiGet("environments.list").then((environments2) => {
          if (mounted.current) dispatch({ type: "environments/loaded", environments: environments2 });
        }).catch((error) => notify({ kind: "warning", message: `\u73AF\u5883\u6E05\u5355\u52A0\u8F7D\u5931\u8D25\uFF1A${describeError(error)}` }));
      }, [notify]);
      const switchLanguage = (0, import_react10.useCallback)((language2) => {
        dispatch({ type: "busy", label: "\u4FDD\u5B58\u8BED\u8A00\u504F\u597D\u2026" });
        void apiPost("profile.set", { patch: { language: language2 } }).then(() => {
          if (!mounted.current) return;
          notify({ kind: "info", message: `\u5DF2\u5207\u6362\u8BB2\u89E3\u8BED\u8A00\uFF1A${language2 === "zh" ? "\u4E2D\u6587" : language2 === "en" ? "English" : "\u4E2D\u82F1\u53CC\u8BED"}\u3002` });
          void bootstrap();
        }).catch((error) => notify({ kind: "error", message: `\u8BED\u8A00\u504F\u597D\u4FDD\u5B58\u5931\u8D25\uFF1A${describeError(error)}` })).finally(() => {
          if (mounted.current) dispatch({ type: "busy", label: void 0 });
        });
      }, [notify, bootstrap]);
      const openSource = (0, import_react10.useCallback)((documentId) => {
        if (documentId === void 0) {
          notify({ kind: "info", message: "\u8FD9\u6761\u6765\u6E90\u6CA1\u6709\u672C\u5730\u539F\u6587\u4F4D\u7F6E\uFF08\u53EF\u80FD\u662F\u6A21\u578B\u8865\u5145\u6216\u5916\u90E8\u7F51\u9875\uFF09\u3002" });
          return;
        }
        dispatch({ type: "ui/select-source", documentId });
      }, [notify]);
      const onEvidenceClick = (0, import_react10.useCallback)((reference) => {
        if (reference.anchor !== void 0) {
          dispatch({ type: "ui/select-source", documentId: reference.anchor.documentId });
          dispatch({ type: "ui/tab", tab: "sources" });
          return;
        }
        if (reference.url !== void 0) {
          window.open(reference.url, "_blank", "noopener,noreferrer");
          return;
        }
        notify({ kind: "info", message: `\u8BE5\u6765\u6E90\u7C7B\u578B\uFF1A${reference.kind}${reference.note !== void 0 ? `\uFF08${reference.note}\uFF09` : ""}` });
      }, [notify]);
      const onAnchorClick = (0, import_react10.useCallback)((anchor) => {
        dispatch({ type: "ui/select-source", documentId: anchor.documentId });
        dispatch({ type: "ui/tab", tab: "sources" });
      }, []);
      const openGoalsEditor = (0, import_react10.useCallback)(() => {
        const current = state.courseDetail;
        if (current === void 0) return;
        const revision = current.activeRevision ?? current.draftRevision;
        setGoalsEditor({
          courseId: current.course.id,
          goals: (revision?.goals ?? []).join("\n"),
          background: revision?.background ?? ""
        });
      }, [state.courseDetail]);
      const saveGoals = (0, import_react10.useCallback)(async () => {
        if (goalsEditor === void 0) return;
        const goals2 = goalsEditor.goals.split("\n").map((line) => line.trim()).filter((line) => line !== "");
        if (goals2.length === 0) {
          notify({ kind: "warning", message: "\u8BF7\u81F3\u5C11\u4FDD\u7559\u4E00\u4E2A\u5B66\u4E60\u76EE\u6807\u3002" });
          return;
        }
        setSavingGoals(true);
        try {
          await apiPost("courseGoals.update", {
            courseId: goalsEditor.courseId,
            goals: goals2,
            ...goalsEditor.background.trim() === "" ? {} : { background: goalsEditor.background.trim() }
          });
          const [detail2, sessionsResponse] = await Promise.all([
            apiGet("courses.get", { courseId: goalsEditor.courseId }),
            apiGet("sessions.list", { courseId: goalsEditor.courseId })
          ]);
          dispatch({ type: "course/loaded", detail: detail2, sessions: sessionsResponse.sessions });
          notify({ kind: "info", message: "\u5B66\u4E60\u76EE\u6807\u5DF2\u66F4\u65B0\uFF1B\u5DF2\u6709\u5B66\u4E60\u4F1A\u8BDD\u4FDD\u6301\u4E0D\u53D8\uFF0C\u65B0\u4F1A\u8BDD\u4F7F\u7528\u66F4\u65B0\u540E\u7684\u76EE\u6807\u3002" });
          setGoalsEditor(void 0);
        } catch (error) {
          notify({ kind: "error", message: `\u66F4\u65B0\u5B66\u4E60\u76EE\u6807\u5931\u8D25\uFF1A${describeError(error)}` });
        } finally {
          setSavingGoals(false);
        }
      }, [goalsEditor, notify]);
      const createCourse = (0, import_react10.useCallback)(async (input) => {
        dispatch({ type: "busy", label: "\u5EFA\u7ACB\u8BFE\u7A0B\u2026" });
        try {
          const { course } = await apiPost("courses.create", input);
          const { courses } = await apiGet("courses.list");
          if (mounted.current) dispatch({ type: "courses/loaded", courses });
          return course.id;
        } catch (error) {
          notify({ kind: "error", message: `\u5EFA\u7ACB\u8BFE\u7A0B\u5931\u8D25\uFF1A${describeError(error)}` });
          return void 0;
        } finally {
          if (mounted.current) dispatch({ type: "busy", label: void 0 });
        }
      }, [notify]);
      const refreshCourse = (0, import_react10.useCallback)(async (courseId) => {
        const [detail2, sessionsResponse] = await Promise.all([
          apiGet("courses.get", { courseId }),
          apiGet("sessions.list", { courseId })
        ]);
        if (mounted.current) {
          dispatch({ type: "course/loaded", detail: detail2, sessions: sessionsResponse.sessions });
          dispatch({ type: "sessions/loaded", sessions: sessionsResponse.sessions });
        }
        return { detail: detail2, sessions: sessionsResponse.sessions };
      }, []);
      const importPaths = (0, import_react10.useCallback)(async (courseId, paths) => {
        dispatch({ type: "busy", label: "\u5F00\u59CB\u5BFC\u5165\u8D44\u6599\u2026" });
        try {
          const { task } = await apiPost("sources.import", { courseId, paths });
          notify({ kind: "info", message: `\u5DF2\u5F00\u59CB\u5BFC\u5165\uFF1A${task.snapshot.label}` });
          void loadTasks();
          const snapshot = await awaitTask(task.id);
          if (snapshot?.status === "partial") {
            return { ok: false, error: `\u8D44\u6599\u90E8\u5206\u5BFC\u5165\uFF1A${(snapshot.warnings ?? []).join("\uFF1B") || "\u90E8\u5206\u6587\u4EF6\u5931\u8D25\uFF0C\u8BE6\u89C1\u4EFB\u52A1\u8BE6\u60C5\u3002"}` };
          }
          if (snapshot?.status === "failed") {
            return { ok: false, error: `\u8D44\u6599\u5BFC\u5165\u5931\u8D25\uFF1A${snapshot.error?.message ?? "\u672A\u77E5\u539F\u56E0"}` };
          }
          if (snapshot === void 0) return { ok: false, error: "\u5BFC\u5165\u4EFB\u52A1\u672A\u5728\u9650\u5B9A\u65F6\u95F4\u5185\u5B8C\u6210\uFF0C\u8BF7\u7A0D\u540E\u5237\u65B0\u4EFB\u52A1\u72B6\u6001\u91CD\u8BD5\u3002" };
          notify({ kind: "info", message: "\u8D44\u6599\u5BFC\u5165\u5B8C\u6210\uFF0C\u53EF\u4EE5\u751F\u6210\u8BFE\u7A0B\u8349\u6848\u3002" });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: `\u5BFC\u5165\u5931\u8D25\uFF1A${describeError(error)}` };
        } finally {
          if (mounted.current) dispatch({ type: "busy", label: void 0 });
          void loadTasks();
        }
      }, [loadTasks, awaitTask, notify]);
      const generateDraft = (0, import_react10.useCallback)(async (courseId) => {
        dispatch({ type: "busy", label: "\u751F\u6210\u8BFE\u7A0B\u7ED3\u6784\u8349\u6848\u2026" });
        try {
          const { task } = await apiPost("courseDraft.generate", { courseId });
          void loadTasks();
          const snapshot = await awaitTask(task.id);
          if (snapshot === void 0) {
            return { ok: false, error: "\u8349\u6848\u751F\u6210\u4EFB\u52A1\u6CA1\u6709\u5728\u9650\u5B9A\u65F6\u95F4\u5185\u5B8C\u6210\uFF08\u672A\u83B7\u53D6\u5230\u4EFB\u52A1\u72B6\u6001\uFF09\u3002" };
          }
          if (snapshot.status === "failed") {
            return { ok: false, error: `\u8BFE\u7A0B\u8349\u6848\u751F\u6210\u5931\u8D25\uFF1A${snapshot.error?.message ?? "\u672A\u77E5\u539F\u56E0"}` };
          }
          if (snapshot.status === "cancelled") return { ok: false, error: "\u8BFE\u7A0B\u8349\u6848\u751F\u6210\u5DF2\u53D6\u6D88\u3002" };
          const { draft } = await apiGet("courseDraft.get", { courseId });
          if (!mounted.current) return { ok: false, error: "\u754C\u9762\u5DF2\u5173\u95ED" };
          if (draft === void 0) {
            return { ok: false, error: "\u8349\u6848\u5C1A\u672A\u751F\u6210\uFF1A\u8BF7\u786E\u8BA4\u8D44\u6599\u5DF2\u5BFC\u5165\u6210\u529F\uFF0C\u6216\u8FD4\u56DE\u8865\u5145\u8D44\u6599\u540E\u91CD\u8BD5\u3002" };
          }
          dispatch({ type: "draft/loaded", draft });
          return { ok: true, draft };
        } catch (error) {
          return { ok: false, error: `\u8BFE\u7A0B\u8349\u6848\u751F\u6210\u5931\u8D25\uFF1A${describeError(error)}` };
        } finally {
          if (mounted.current) dispatch({ type: "busy", label: void 0 });
          void loadTasks();
        }
      }, [loadTasks, awaitTask]);
      const confirmDraft = (0, import_react10.useCallback)(async (courseId, revisionId) => {
        if (revisionId === "") return { ok: false, error: "\u8349\u6848\u7248\u672C\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210\u8349\u6848\u3002" };
        dispatch({ type: "busy", label: "\u786E\u8BA4\u8BFE\u7A0B\u7ED3\u6784\u2026" });
        try {
          await apiPost("courseDraft.confirm", { courseId, revisionId });
          const { sessions } = await refreshCourse(courseId);
          const first = sessions[0];
          if (first !== void 0) await selectSession(first.id);
          else await createSession(courseId);
          notify({ kind: "info", message: "\u8BFE\u7A0B\u7ED3\u6784\u5DF2\u786E\u8BA4\uFF0C\u5F00\u59CB\u7CFB\u7EDF\u5B66\u4E60\u3002" });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: `\u786E\u8BA4\u8BFE\u7A0B\u7ED3\u6784\u5931\u8D25\uFF1A${describeError(error)}` };
        } finally {
          if (mounted.current) dispatch({ type: "busy", label: void 0 });
        }
      }, [notify, refreshCourse, selectSession, createSession]);
      const startAdhocSession = (0, import_react10.useCallback)(async (courseId) => {
        dispatch({ type: "busy", label: "\u521B\u5EFA\u968F\u95EE\u968F\u5B66\u4F1A\u8BDD\u2026" });
        try {
          const { session } = await apiPost("sessions.create", {
            courseId,
            mode: "adhoc"
          });
          await refreshCourse(courseId);
          await selectSession(session.id);
          notify({ kind: "info", message: "\u5DF2\u7528\u300C\u5148\u968F\u4FBF\u95EE\u95EE\u300D\u5F00\u59CB\uFF1A\u7ED3\u6784\u662F\u6700\u5C0F\u786E\u8BA4\u7248\u672C\uFF0C\u4E4B\u540E\u4ECD\u53EF\u751F\u6210\u5B8C\u6574\u8349\u6848\u3002" });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: `\u968F\u95EE\u968F\u5B66\u4F1A\u8BDD\u521B\u5EFA\u5931\u8D25\uFF1A${describeError(error)}` };
        } finally {
          if (mounted.current) dispatch({ type: "busy", label: void 0 });
        }
      }, [notify, refreshCourse, selectSession]);
      const loadSetupDraft = (0, import_react10.useCallback)(async (courseId) => {
        setSetup({ phase: "loading" });
        try {
          const { draft } = await apiGet("courseDraft.get", { courseId });
          if (!mounted.current) return;
          if (draft === void 0) {
            setSetup({ phase: "error", error: "\u8FD8\u6CA1\u6709\u53EF\u786E\u8BA4\u7684\u8349\u6848\uFF1A\u8BF7\u5148\u5BFC\u5165\u8D44\u6599\u540E\u751F\u6210\u8349\u6848\uFF0C\u6216\u76F4\u63A5\u300C\u5148\u968F\u4FBF\u95EE\u95EE\u300D\u3002" });
          } else {
            setSetup({ phase: "draft", draft });
          }
        } catch (error) {
          if (mounted.current) setSetup({ phase: "error", error: `\u8BFB\u53D6\u8BFE\u7A0B\u8349\u6848\u5931\u8D25\uFF1A${describeError(error)}` });
        }
      }, []);
      const generateSetupDraft = (0, import_react10.useCallback)(async (courseId) => {
        setSetup({ phase: "loading" });
        const result = await generateDraft(courseId);
        if (!mounted.current) return;
        if (result.ok && result.draft !== void 0) setSetup({ phase: "draft", draft: result.draft });
        else setSetup({ phase: "error", error: result.error ?? "\u8BFE\u7A0B\u8349\u6848\u751F\u6210\u5931\u8D25" });
      }, [generateDraft]);
      const confirmSetupDraft = (0, import_react10.useCallback)(async (courseId, revisionId) => {
        setSetup((previous) => ({ ...previous, busy: true, error: void 0 }));
        const result = await confirmDraft(courseId, revisionId);
        if (!mounted.current) return;
        setSetup(result.ok ? { phase: "ready" } : (previous) => ({ ...previous, busy: false, error: result.error }));
      }, [confirmDraft]);
      const adhocSetup = (0, import_react10.useCallback)(async (courseId) => {
        setSetup((previous) => ({ ...previous, busy: true, error: void 0 }));
        const result = await startAdhocSession(courseId);
        if (!mounted.current) return;
        setSetup(result.ok ? { phase: "ready" } : (previous) => ({ ...previous, busy: false, error: result.error }));
      }, [startAdhocSession]);
      const detail = state.courseDetail;
      const progress = computeCourseProgress({
        courseDetail: detail,
        session: state.session,
        mastery: state.mastery
      });
      const goals = (detail?.activeRevision ?? detail?.draftRevision)?.goals ?? (state.bootstrap?.profile.goals !== void 0 ? [state.bootstrap.profile.goals] : []);
      const language = state.bootstrap?.language ?? state.bootstrap?.profile.language ?? "zh";
      const busy = state.busy !== void 0 || isChatBusy(state);
      const draftForOnboarding = state.courseDraft;
      const onboardingCallbacks = {
        ...state.bootstrap !== void 0 ? { bootstrap: state.bootstrap } : {},
        ...state.busy !== void 0 ? { busy: state.busy } : {},
        ...state.notice?.kind === "error" ? { error: { code: "failed", message: state.notice.message } } : {},
        tasks: state.tasks,
        ...draftForOnboarding !== void 0 ? { draft: draftForOnboarding } : {},
        onDismissError: () => notify(void 0),
        onCancelTask: (taskId) => {
          void cancelTask(taskId);
        },
        onCreateCourse: createCourse,
        onImportPaths: importPaths,
        onGenerateDraft: generateDraft,
        onConfirmDraft: confirmDraft,
        onStartAdhoc: startAdhocSession,
        ...props.pickDirectory === void 0 ? {} : { onPickDirectory: props.pickDirectory }
      };
      return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ai-teaching-root", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          TopBar,
          {
            ...state.bootstrap !== void 0 ? { bootstrap: state.bootstrap } : {},
            ...detail !== void 0 ? { courseTitle: detail.course.title } : {},
            goals,
            language,
            offline: !online,
            busy,
            tasks: state.tasks,
            onLanguage: switchLanguage,
            onCancelTask: (taskId) => {
              void cancelTask(taskId);
            }
          }
        ),
        state.notice !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          Banner,
          {
            kind: state.notice.kind,
            message: state.notice.message,
            ...state.notice.code !== void 0 ? { details: state.notice.code } : {},
            onDismiss: () => notify(void 0)
          }
        ),
        state.phase === "fatal" && state.fatalError !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { padding: 20 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ErrorBanner, { error: state.fatalError, onRetry: () => void bootstrap() }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "ai-muted", children: "\u65E0\u6CD5\u8FDE\u63A5\u6559\u5B66 Host\u3002\u8BF7\u786E\u8BA4\u63D2\u4EF6\u5DF2\u542F\u7528\u3001Harness \u4ECD\u5728\u8FD0\u884C\uFF1B\u5DF2\u5B8C\u6210\u7684\u672C\u5730\u5B66\u4E60\u8BB0\u5F55\u4E0D\u4F1A\u4E22\u5931\u3002" })
        ] }),
        state.phase === "loading" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { padding: 24 }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Spinner, { label: "\u6B63\u5728\u8FDE\u63A5\u6559\u5B66 Host\u2026" }) }),
        state.phase === "onboarding" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          Onboarding,
          {
            ...onboardingCallbacks,
            canCancel: state.courses.length > 0,
            onCancel: () => dispatch({ type: "wizard/close" })
          }
        ),
        state.phase === "ready" && needsCourseSetup(detail) && detail !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          CourseSetupCard,
          {
            detail,
            phase: setup.phase,
            ...setup.draft !== void 0 ? { draft: setup.draft } : {},
            ...setup.error !== void 0 ? { error: setup.error } : {},
            busy: busy || setup.busy === true,
            hasDraftConcepts: draftConceptCount(detail) > 0,
            onGenerate: () => {
              void generateSetupDraft(detail.course.id);
            },
            onLoadDraft: () => {
              void loadSetupDraft(detail.course.id);
            },
            onConfirm: (revisionId) => {
              void confirmSetupDraft(detail.course.id, revisionId);
            },
            onAdhoc: () => {
              void adhocSetup(detail.course.id);
            }
          }
        ),
        state.phase === "ready" && !needsCourseSetup(detail) && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ai-teaching-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
            Sidebar,
            {
              courses: state.courses,
              ...detail !== void 0 ? { courseDetail: detail } : {},
              sessions: state.sessions,
              ...state.session !== void 0 ? { session: state.session } : {},
              mastery: state.mastery,
              review: sortedReview(state.review),
              progress,
              busy,
              onSelectCourse: (courseId) => {
                void selectCourse(courseId);
              },
              onNewCourse: () => dispatch({ type: "wizard/open" }),
              onDeleteCourse: (courseId, title) => {
                setDeleteSources(false);
                setDeleteTarget({ id: courseId, title });
              },
              onEditGoals: openGoalsEditor,
              onSelectSession: (sessionId) => {
                void selectSession(sessionId);
              },
              onNewSession: () => {
                const courseId = detail?.course.id;
                if (courseId === void 0) {
                  notify({ kind: "warning", message: "\u8BF7\u5148\u5EFA\u7ACB\u8BFE\u7A0B\u3002" });
                  return;
                }
                void createSession(courseId);
              },
              onConceptClick: (concept) => {
                void sendMessage(`\u8BF7\u4ECE\u6982\u5FF5\u300C${concept.title}\u300D\u7EE7\u7EED\u6559\u5B66\uFF1A\u5148\u786E\u8BA4\u6211\u7684\u7406\u89E3\u7A0B\u5EA6\uFF0C\u518D\u51B3\u5B9A\u8BB2\u89E3\u6216\u7EC3\u4E60\u3002`);
              },
              onReviewConcept: (item) => {
                const concept = (detail?.activeRevision ?? detail?.draftRevision)?.concepts.find((candidate) => candidate.id === item.conceptId);
                void sendMessage(`\u8BF7\u5E2E\u6211\u590D\u4E60\u300C${concept?.title ?? "\u8FD9\u4E2A\u6982\u5FF5"}\u300D\uFF1A\u5148\u505A\u4E00\u4E2A\u7B80\u77ED\u8BCA\u65AD\uFF0C\u518D\u6309\u9700\u7ED9\u63D0\u793A\u3002`);
              },
              onOpenSource: (documentId) => openSource(documentId)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ai-teaching-main", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              ChatPanel,
              {
                ...detail !== void 0 ? { courseTitle: detail.course.title } : {},
                ...state.session !== void 0 ? { session: state.session } : {},
                messages: state.messages,
                activities: state.activities,
                chat: state.chat,
                busy,
                offline: !online,
                onSend: (text2) => {
                  void sendMessage(text2);
                },
                onStop: () => {
                  void stopGeneration();
                },
                onQuickAction: quickAction,
                onActivityClick: (activityId) => dispatch({ type: "ui/select-activity", activityId }),
                onEvidenceClick,
                onRetry: retryLast,
                onDismissError: () => dispatch({ type: "error/clear" })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              TeachingArea,
              {
                activities: state.activities,
                ...state.selectedActivityId !== void 0 ? { selectedActivityId: state.selectedActivityId } : {},
                ...state.selectedSourceDocumentId !== void 0 ? { selectedDocumentId: state.selectedSourceDocumentId } : {},
                activityStates: state.activityStates,
                selectedTab: state.selectedTab,
                ...detail !== void 0 ? { courseDetail: detail } : {},
                ...state.session !== void 0 ? { session: state.session } : {},
                ...state.environments !== void 0 ? { environments: state.environments } : {},
                runResults,
                notes: notesDraft,
                busy,
                onSelectTab: (tab) => {
                  dispatch({ type: "ui/tab", tab });
                  if (tab === "experiments" && state.environments === void 0) loadEnvironments();
                },
                onSelectActivity: (activityId) => dispatch({ type: "ui/select-activity", activityId }),
                onStateChange: persistActivityState,
                onRunCode,
                onCancelRun,
                onQuizSubmit,
                onAnswerSubmit,
                onHelpExposure,
                onAnchorClick,
                onOpenSource: (documentId) => openSource(documentId),
                onRefreshSource: (documentId) => {
                  void refreshSource(documentId);
                },
                loadSource,
                onLoadEnvironments: loadEnvironments,
                onNotesChange: setNotesDraft,
                onSaveNotes: saveNotes,
                onEvidenceClick
              }
            )
          ] })
        ] }),
        goalsEditor !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ai-modal-overlay", role: "dialog", "aria-modal": "true", "aria-label": "\u7F16\u8F91\u5B66\u4E60\u76EE\u6807", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ai-modal", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h3", { children: "\u7F16\u8F91\u5B66\u4E60\u76EE\u6807" }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "ai-muted", style: { margin: "0 0 8px" }, children: "\u6BCF\u884C\u4E00\u4E2A\u76EE\u6807\u3002\u66F4\u65B0\u4F1A\u751F\u6210\u65B0\u7684\u8BFE\u7A0B\u7ED3\u6784\u4FEE\u8BA2\uFF1B\u5DF2\u6709\u5B66\u4E60\u4F1A\u8BDD\u4ECD\u7ED1\u5B9A\u539F\u4FEE\u8BA2\uFF0C\u65B0\u4F1A\u8BDD\u4F7F\u7528\u65B0\u76EE\u6807\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
            "textarea",
            {
              "aria-label": "\u5B66\u4E60\u76EE\u6807\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF09",
              rows: 5,
              style: { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 13 },
              value: goalsEditor.goals,
              onChange: (event) => setGoalsEditor({ ...goalsEditor, goals: event.target.value })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "ai-muted", style: { display: "block", marginTop: 8, fontSize: 12 }, children: "\u6211\u7684\u57FA\u7840/\u80CC\u666F\uFF08\u53EF\u9009\uFF09" }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
            "textarea",
            {
              "aria-label": "\u5B66\u4E60\u57FA\u7840\u4E0E\u80CC\u666F",
              rows: 2,
              style: { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 13 },
              value: goalsEditor.background,
              onChange: (event) => setGoalsEditor({ ...goalsEditor, background: event.target.value })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ai-modal-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "ai-small-button", disabled: savingGoals, onClick: () => setGoalsEditor(void 0), children: "\u53D6\u6D88" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "ai-primary-button", disabled: savingGoals, onClick: () => void saveGoals(), children: savingGoals ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u76EE\u6807" })
          ] })
        ] }) }),
        deleteTarget !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "ai-modal-overlay", role: "dialog", "aria-modal": "true", "aria-label": "\u5220\u9664\u8BFE\u7A0B\u786E\u8BA4", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ai-modal", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("h3", { children: [
            "\u5220\u9664\u8BFE\u7A0B\u300C",
            deleteTarget.title,
            "\u300D\uFF1F"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("p", { className: "ai-muted", style: { margin: "0 0 10px" }, children: [
            "\u5C06\u5220\u9664\u8BE5\u8BFE\u7A0B\u7684\u8BFE\u7A0B\u7ED3\u6784\u3001\u5168\u90E8\u5B66\u4E60\u4F1A\u8BDD\u3001\u6D3B\u52A8\u3001\u5B66\u4E60\u8BB0\u5F55\uFF08\u5C1D\u8BD5/\u638C\u63E1/\u590D\u4E60/\u7B14\u8BB0\uFF09\u3002",
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { children: "\u4F60\u7684\u539F\u59CB\u8D44\u6599\u6587\u4EF6\u4E0D\u4F1A\u88AB\u4FEE\u6539\u3002" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "ai-row", style: { alignItems: "center", gap: 6, fontSize: 13 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              "input",
              {
                type: "checkbox",
                checked: deleteSources,
                onChange: (event) => setDeleteSources(event.target.checked)
              }
            ),
            "\u540C\u65F6\u5220\u9664\u8BE5\u8BFE\u7A0B\u5BFC\u5165\u7684\u8D44\u6599\u89E3\u6790\u8BB0\u5F55\uFF08\u4EC5\u9650\u672A\u88AB\u5176\u4ED6\u8BFE\u7A0B\u4F7F\u7528\uFF1B\u539F\u6587\u4EF6\u4E0D\u53D7\u5F71\u54CD\uFF09"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "ai-modal-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              "button",
              {
                type: "button",
                className: "ai-small-button",
                disabled: deleting,
                onClick: () => {
                  setDeleteTarget(void 0);
                  setDeleteSources(false);
                },
                children: "\u53D6\u6D88"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              "button",
              {
                type: "button",
                className: "ai-danger-button",
                disabled: deleting,
                onClick: () => void confirmDeleteCourse(),
                children: deleting ? "\u5220\u9664\u4E2D\u2026" : "\u786E\u8BA4\u5220\u9664"
              }
            )
          ] })
        ] }) })
      ] });
    }

    // packages/dsh-plugin/src/client/index.tsx
    var import_jsx_runtime11 = require("react/jsx-runtime");
    var name = "ai-teaching-client";
    var inject = ["slots"];
    var PANEL_ID = "ai-teaching";
    function injectStyleOnce(id, css) {
      if (typeof document === "undefined") return;
      if (document.getElementById(id) !== null) return;
      const style = document.createElement("style");
      style.id = id;
      style.textContent = css;
      document.head.appendChild(style);
    }
    function ensureStyles() {
      injectStyleOnce("ai-teaching-katex-css", katex_min_default);
      injectStyleOnce("ai-teaching-css", TEACHING_CSS);
    }
    function TeachingIcon({ size }) {
      const dimension = size ?? 20;
      return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("svg", { width: dimension, height: dimension, viewBox: "0 0 20 20", fill: "none", "aria-hidden": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          "path",
          {
            d: "M3.5 4.2c1.9-.9 3.9-.9 6.5.4 2.6-1.3 4.6-1.3 6.5-.4v9.6c-1.9-.8-3.9-.8-6.5.5-2.6-1.3-4.6-1.3-6.5-.5V4.2Z",
            stroke: "currentColor",
            strokeWidth: "1.4",
            strokeLinejoin: "round"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("path", { d: "M10 4.8v9.2M6.2 7.1h1.9M6.2 9.6h1.9M11.9 7.1h1.9M11.9 9.6h1.9", stroke: "currentColor", strokeWidth: "1.1", strokeLinecap: "round" })
      ] });
    }
    var PanelErrorBoundary = class extends import_react11.default.Component {
      state = {};
      static getDerivedStateFromError(error) {
        return { error };
      }
      render() {
        if (this.state.error !== void 0) {
          return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: { padding: 20 }, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "ai-banner", "data-kind": "error", role: "alert", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { children: [
            "\u6559\u5B66\u754C\u9762\u51FA\u73B0\u4E86\u9519\u8BEF\uFF1A",
            this.state.error.message,
            "\u3002\u5237\u65B0\u9875\u9762\u53EF\u91CD\u8BD5\uFF1B\u5B66\u4E60\u8BB0\u5F55\u4FDD\u5B58\u5728\u672C\u673A Host\u3002"
          ] }) }) });
        }
        return this.props.children;
      }
    };
    function TeachingPage(props) {
      (0, import_react11.useEffect)(() => {
        ensureStyles();
      }, []);
      return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(PanelErrorBoundary, { children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(TeachingWorkspace, { ...props.pickDirectory === void 0 ? {} : { pickDirectory: props.pickDirectory } }) });
    }
    function bindDirectoryPicker(ctx) {
      return async () => {
        const uiWorkspace = ctx.get?.("uiWorkspace");
        if (uiWorkspace?.pickDirectory === void 0) return null;
        try {
          return await uiWorkspace.pickDirectory();
        } catch {
          return null;
        }
      };
    }
    function apply(ctx) {
      const pickDirectory = bindDirectoryPicker(ctx);
      ctx.slots.inject("main", () => ctx.slots.register(
        { name: "main", key: PANEL_ID },
        () => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(TeachingPage, { pickDirectory })
      ));
      ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 10,
        label: () => "AI \u6559\u5B66"
      }, TeachingIcon));
    }

    return module.exports;
  },
});
