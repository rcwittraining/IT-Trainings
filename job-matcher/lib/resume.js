/* RCW Job Matcher - resume ingestion and parsing.
 *
 * Everything here runs in the visitor's browser on their own machine:
 *   - text/paste, .txt/.md/.rtf, .docx (ZIP + DecompressionStream) and .pdf
 *     (best-effort FlateDecode text extraction) are supported with no third-party
 *     library and no upload anywhere.
 *   - If a PDF has no extractable text layer, the caller is told to paste text instead
 *     rather than silently parsing garbage.
 *
 * Browser: window.RCWJM.resume   Node (tests): module.exports
 */
(function (root, factory) {
  'use strict';
  var t = typeof module === 'object' && module && module.exports
    ? require('./text.js')
    : (root.RCWJM && root.RCWJM.text);
  var s = typeof module === 'object' && module && module.exports
    ? require('./skills.js')
    : (root.RCWJM && root.RCWJM.skills);
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory(t, s);
  } else {
    root.RCWJM = root.RCWJM || {};
    root.RCWJM.resume = factory(t, s);
  }
}(typeof self !== 'undefined' ? self : this, function (text, skills) {
  'use strict';

  var SECTION_HEADERS = [
    { key: 'summary', re: /^(professional\s+)?(summary|profile|about\s+me|objective|highlights?|career\s+snapshot|executive\s+profile)\b/i },
    { key: 'skills', re: /^(technical\s+|core\s+|key\s+)?(skills?|competencies|expertise|technolog(y|ies)|tools?\s*(?:and|\/)\s*(?:platforms?)?)\b/i },
    { key: 'experience', re: /^(work\s+|professional\s+|employment\s+|relevant\s+)?(experience|history|roles?)\b/i },
    { key: 'projects', re: /^(key\s+|selected\s+|notable\s+)?(projects?|assignments?|engagements?|achievements?|accomplishments?)\b/i },
    { key: 'education', re: /^(academics?|educational\s+qualifications?|education|academic\s+qualifications?)\b/i },
    { key: 'certifications', re: /^(certifications?|licences?|licenses?|credentials?|courses?|training)\b/i },
    { key: 'publications', re: /^(publications?|patents?|speaker\s+engagements?|community|open\s+source|blog)\b/i },
    { key: 'additional', re: /^(additional\s+information|extra\s+curricular|intrests?|languages?|declaration|notice\s+period|personal\s+details?)\b/i }
  ];

  var IGNORE_HEADINGS = /^(references|declaration|additional information|hobbies|personal details|address)\b/i;

  var DATE_RANGE = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*'?\d{2,4}|\d{1,2}[/-]\d{2,4}|\d{4})\s*(?:-|–|—|to|until|through)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*'?\d{2,4}|\d{1,2}[/-]\d{2,4}|\d{4}|present|current|now|till\s+date|ongoing)/i;

  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];

  /* ---------------------------------------------------------------- extraction */

  function readAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('The file could not be read.')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function readAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('The file could not be read.')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * inflate raw-deflate using only platform primitives (no library, no CDN).
   * Response.body.pipeThrough is used rather than Blob#stream().pipe() because the
   * former is defined web-streams API in every browser that ships DecompressionStream.
   */
  function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined' || typeof Response === 'undefined') {
      return Promise.reject(new Error('This browser cannot decompress ZIP/PDF streams. Paste the resume text instead (Chrome 80+, Edge 80+, Firefox 113+, Safari 16.4+ all can).'));
    }
    var inflated = new Response(bytes).body.pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(inflated).text().then(function (value) { return value; });
  }

  /** Minimal ZIP reader: only the entry we need, no general-purpose unzip. */
  function zipEntry(buffer, wantedName) {
    var view = new DataView(buffer);
    var bytes = new Uint8Array(buffer);
    // Locate End Of Central Directory (signature 0x06054b50) scanning backwards.
    var eocd = -1;
    for (var i = bytes.length - 22; i >= 0 && i > bytes.length - 66000; i -= 1) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd === -1) throw new Error('Not a valid .docx (no ZIP directory found). Save it as .docx or paste the text.');
    var count = view.getUint16(eocd + 10, true);
    var offset = view.getUint32(eocd + 16, true);
    var ptr = offset;
    for (var n = 0; n < count; n += 1) {
      if (view.getUint32(ptr, true) !== 0x02014b50) break;
      var method = view.getUint16(ptr + 10, true);
      var compSize = view.getUint32(ptr + 20, true);
      var nameLen = view.getUint16(ptr + 28, true);
      var extraLen = view.getUint16(ptr + 30, true);
      var commentLen = view.getUint16(ptr + 32, true);
      var localOffset = view.getUint32(ptr + 42, true);
      var name = new TextDecoder().decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
      ptr += 46 + nameLen + extraLen + commentLen;
      if (name !== wantedName) continue;
      // Jump to the local header to find where the data really starts.
      var lNameLen = view.getUint16(localOffset + 26, true);
      var lExtraLen = view.getUint16(localOffset + 28, true);
      var start = localOffset + 30 + lNameLen + lExtraLen;
      var slice = bytes.subarray(start, start + compSize);
      if (method === 0) return Promise.resolve(new TextDecoder('utf-8').decode(slice));
      return inflateRaw(slice);
    }
    throw new Error('This .docx has no ' + wantedName + ' part. Paste the resume text instead.');
  }

  function docxToText(buffer) {
    return zipEntry(buffer, 'word/document.xml').then(function (xml) {
      return xml
        .replace(/<w:tab[^>]*\/?>/gi, '\t')
        .replace(/<w:br[^>]*\/?>/gi, '\n')
        .replace(/<\/w:p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\r/g, '')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    });
  }

  /**
   * Best-effort PDF text extraction: walk the content streams, inflate FlateDecode,
   * read literal/hex strings from Tj/TJ/' operators. Handles the common
   * Word/Google-Docs/LaTeX-with-embedded-standard-fonts case. No font-encoding
   * recovery for CID subsets, hence the readability guard in `pdfLooksBroken`.
   */
  function pdfToText(buffer) {
    var bytes = new Uint8Array(buffer);
    var raw = new TextDecoder('latin1').decode(bytes);
    var jobs = [];
    var re = /<<([^>]{0,4000}?)>>\s*stream\r?\n?/g;
    var match;
    var chunks = [];
    var pending = [];
    while ((match = re.exec(raw)) !== null) {
      var dict = match[1];
      var start = match.index + match[0].length;
      var endMatch = /endstream/g.exec(raw.slice(start));
      if (!endMatch) break;
      var end = start + endMatch.index;
      var isFlate = /\/FlateDecode/.test(dict);
      var lengthMatch = dict.match(/\/Length\s+(\d+)/);
      var size = lengthMatch ? parseInt(lengthMatch[1], 10) : (end - start);
      size = Math.max(0, Math.min(size, end - start));
      var slice = bytes.subarray(start, start + size);
      if (isFlate) pending.push(inflateRaw(slice).catch(function () { return ''; }));
      else pending.push(Promise.resolve(new TextDecoder('latin1').decode(slice)));
      re.lastIndex = end;
    }
    if (!pending.length) return Promise.resolve('');
    return Promise.all(pending).then(function (streams) {
      var out = [];
      streams.forEach(function (stream) {
        if (!stream || stream.indexOf('Tj') === -1 && stream.indexOf('TJ') === -1 && stream.indexOf("T'") === -1) return;
        out.push(readPdfOperators(stream));
      });
      var joined = out.join('\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      return joined;
    });
  }

  function readPdfOperators(stream) {
    var lines = [];
    var current = [];
    var i = 0;
    var len = stream.length;
    function flushText(mode) {
      if (!current.length) return;
      var value = current.join(mode === 'TJ' ? '' : ' ').replace(/\s+/g, ' ').trim();
      current = [];
      if (value) lines.push(value);
    }
    while (i < len) {
      var ch = stream[i];
      if (ch === '(') {
        var depth = 1, buf = '', j = i + 1;
        while (j < len && depth > 0) {
          var c = stream[j];
          if (c === '\\') {
            var next = stream[j + 1];
            if (next === 'n') buf += '\n';
            else if (next === 't') buf += '\t';
            else if (next >= '0' && next <= '7') {
              var oct = stream.substr(j + 1, 3).match(/^[0-7]{1,3}/);
              buf += String.fromCharCode(parseInt(oct[0], 8));
              j += oct[0].length;
            } else buf += next;
            j += 2;
            continue;
          }
          if (c === '(') depth += 1;
          if (c === ')') { depth -= 1; if (!depth) { j += 1; break; } }
          if (depth > 0) buf += c;
          j += 1;
        }
        current.push(buf);
        i = j;
        continue;
      }
      if (ch === '<' && stream[i + 1] !== '<') {
        var close = stream.indexOf('>', i);
        if (close === -1) break;
        var hex = stream.slice(i + 1, close).replace(/[^0-9a-fA-F]/g, '');
        var decoded = '';
        for (var k = 0; k + 1 < hex.length; k += 2) {
          var code = parseInt(hex.substr(k, 2), 16);
          if (code > 31 && code < 127) decoded += String.fromCharCode(code);
        }
        if (decoded) current.push(decoded);
        i = close + 1;
        continue;
      }
      if (ch === 'T' && (stream[i + 1] === 'j' || stream[i + 1] === 'J')) {
        flushText(stream[i + 1] === 'J' ? 'TJ' : 'Tj');
        i += 2;
        if (stream[i] === 'x') i += 1;
        continue;
      }
      if (ch === 'T' && stream[i + 1] === '*') { lines.push(''); i += 2; continue; }
      if (ch === "'") { flushText("Tj'"); i += 1; continue; }
      if (ch === 'T' && stream[i + 1] === 'd' && stream[i + 2] === 'T' && stream[i + 3] === 'd') {
        flushText('Td');
        i += 4;
        continue;
      }
      if (ch === 'T' && (stream[i + 1] === 'D' || stream[i + 1] === 'd')) { lines.push(''); i += 2; continue; }
      i += 1;
    }
    flushText('Tj');
    return lines.join('\n');
  }

  function pdfLooksBroken(extracted, sourceBytes) {
    if (!extracted || extracted.length < 220) return true;
    var letters = (extracted.match(/[A-Za-z]/g) || []).length;
    var spaces = (extracted.match(/\s/g) || []).length;
    var words = extracted.split(/\s+/).filter(Boolean);
    var realWords = words.filter(function (w) { return /^[A-Za-z][A-Za-z.#+-]{2,}$/.test(w); });
    var ratio = words.length ? realWords.length / words.length : 0;
    var hasResumeVocab = /(experience|skill|engineer|administrator|project|education|certification|company|responsibilit)/i.test(extracted);
    if (letters < extracted.length * 0.45) return true;
    if (ratio < 0.4 && !hasResumeVocab) return true;
    if (spaces < words.length * 0.4 && !/\n/.test(extracted)) return true;
    return false;
  }

  function rtfToText(raw) {
    var body = String(raw || '');
    // Order matters in an RTF reader:
    //   1. drop skipped destinations ({\* …}) and style/information tables,
    //   2. turn the structural controls into whitespace,
    //   3. protect the escaped characters (\{ \} \\) so they survive step 4,
    //   4. only then remove the remaining control words, then the braces.
    // Running step 4 early is what leaves "rtf1 ansi deff0" in the text; running the
    // skip-destination rule loosely eats {\b bold} content along with the formatting word.
    body = body
      .replace(/\{\s*\\\*[^{}]*\}/g, ' ')
      .replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|header|footer|listtable|listoverridetable|generator|pict|nonshppict|shppict)\b[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gi, ' ')
      .replace(/\\par[d]?\d*\s?/gi, '\n')
      .replace(/\\tab\d*\s?/gi, '\t')
      .replace(/\\line\d*\s?/gi, '\n')
      .replace(/\\row\d*\s?/gi, '\n')
      .replace(/\\cell\d*\s?/gi, ' | ')
      .replace(/\\'[0-9a-fA-F]{2}\s?/g, ' ')
      .replace(/\\u-?\d+\s?/g, '?')
      .replace(/\\\{/g, '\u0001')
      .replace(/\\}/g, '\u0002')
      .replace(/\\\\/g, '\u0003')
      .replace(/\\[a-zA-Z]{1,32}-?\d{0,4}\s?/g, '')
      .replace(/[{}]/g, '')
      .replace(/\u0001/g, '{')
      .replace(/\u0002/g, '}')
      .replace(/\u0003/g, '\\')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
    return body.trim();
  }

  /** file (File|Blob) + filename -> { text, kind, warning } */
  function extractFromFile(file) {
    var name = (file && file.name ? file.name : '').toLowerCase();
    if (/\.pdf$/.test(name)) {
      return readAsArrayBuffer(file).then(function (buffer) {
        return pdfToText(buffer).then(function (extracted) {
          if (pdfLooksBroken(extracted, buffer)) {
            return {
              text: '',
              kind: 'pdf',
              warning: 'That PDF has no clean text layer (it is either scanned or uses embedded subsets). ' +
                'Open it, press Ctrl/Cmd+A, copy and paste the text into the box — that always works.'
            };
          }
          return { text: text.normalize(extracted), kind: 'pdf' };
        }).catch(function () {
          return { text: '', kind: 'pdf', warning: 'This PDF could not be decompressed in your browser. Paste the resume text instead.' };
        });
      });
    }
    if (/\.docx$/.test(name)) {
      return readAsArrayBuffer(file).then(function (buffer) {
        return docxToText(buffer).then(function (value) {
          return { text: text.normalize(value), kind: 'docx' };
        });
      }).catch(function (error) {
        return { text: '', kind: 'docx', warning: error.message || 'Only .docx is supported (not the old .doc format). Use MS Word → Save as → .docx, or paste the text.' };
      });
    }
    return readAsText(file).then(function (raw) {
      if (/\.rtf$/.test(name)) return { text: text.normalize(rtfToText(raw)), kind: 'rtf' };
      return { text: text.stripHtml(raw), kind: 'text' };
    });
  }

  /* ------------------------------------------------------------------ parsing */

  function firstMeaningfulLine(lines) {
    for (var i = 0; i < Math.min(lines.length, 6); i += 1) {
      var line = lines[i].replace(/[|•·\-–—]\s*$/, '').trim();
      if (!line) continue;
      if (/@|https?:|www\.|\d{5}/.test(line)) continue;
      var words = line.split(/\s+/);
      if (words.length >= 1 && words.length <= 6 && /^[A-Za-z .'\-ūāĀ-ǿŊŋ]+$/.test(line)) {
        var isHeading = /experience|summary|skills|education|profile|objective/i.test(line);
        if (!isHeading) return line;
      }
    }
    return '';
  }

  function parseContact(body) {
    var emails = body.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g) || [];
    var phones = body.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{5,8}(?:[\s.-]?\d{0,5})?/g) || [];
    var linkedin = (body.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[A-Za-z0-9._\/-]+/i) || [''])[0];
    var github = (body.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9._-]+/i) || [''])[0];
    var withoutEmails = body.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, ' ');
    var website = (withoutEmails.match(/(?:https?:\/\/)[a-z0-9.-]+\.[a-z]{2,}(?:\/[A-Za-z0-9._\/-]*)?/gi) || [])
      .filter(function (u) { return !/linkedin\.com|github\.com|gmail|yahoo|outlook|rediff|hotmail|example\./i.test(u); });
    var phone = '';
    phones.forEach(function (candidate) {
      var digits = candidate.replace(/\D/g, '');
      if (!phone && digits.length >= 10 && digits.length <= 13) phone = candidate.trim();
    });
    var locationMatch = body.match(/^\s*(?:location|address|current location|based in)\s*[:\-]\s*(.+)$/im);
    var cityLine = '';
    var CITY = 'bengaluru|bangalore|chennai|hyderabad|pune|mumbai|new delhi|delhi|gurgaon|gurugram|noida|kolkata|ahmedabad|kochi|coimbatore|mysore|mysuru|jaipur|vadodara|trivandrum|london|frankfurt|berlin|amsterdam|singapore|dubai|toronto|sydney|new york|austin|seattle|remote';
    if (!locationMatch) {
      var lines = body.split(/\n/).slice(0, 14);
      lines.some(function (line) {
        var m = line.match(new RegExp('^\\s*([A-Z][A-Za-z .\'-]{2,24}(?:,\\s*[A-Z][A-Za-z .\'-]{2,24}){0,2})\\s*(?:[|•·]|$|-|\\bin\\b)', 'i'));
        if (m && new RegExp('(' + CITY + ')', 'i').test(m[1])) {
          cityLine = m[1].replace(/[|•·\s-]+$|\s+\|.*$/g, '').trim();
          return true;
        }
        // "Chennai, India | +91 … | mail@example.com" — location first, then separators.
        var inline = line.match(new RegExp('^\\s*((?:' + CITY + ')[A-Za-z .\'-]*\\s*,?\\s*(?:India|USA|UK|Germany)?)', 'i'));
        if (inline) { cityLine = inline[1].replace(/[|•·\s-]+$/, '').trim(); return true; }
        return false;
      });
    }
    return {
      email: emails[0] || '',
      phone: phone,
      linkedin: linkedin,
      github: github,
      website: website[0] || '',
      location: locationMatch ? locationMatch[1].trim().replace(/[|•].*$/, '') : cityLine
    };
  }

  function parseYears(body) {
    var explicit = [];
    var re = /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b/gi;
    var m;
    while ((m = re.exec(body)) !== null) explicit.push(parseFloat(m[1]));
    var fromRanges = earliestStart(body);
    var candidates = explicit.slice();
    if (fromRanges) candidates.push(fromRanges);
    var value = candidates.length ? Math.max.apply(null, candidates.filter(function (n) { return n >= 0.4 && n <= 45; })) : 0;
    return {
      years: value ? Math.round(value * 10) / 10 : 0,
      explicit: explicit.length ? Math.max.apply(null, explicit) : 0,
      derived: fromRanges || 0
    };
  }

  function monthValue(token) {
    var lower = String(token || '').toLowerCase().replace('.', '');
    var index = -1;
    MONTHS.forEach(function (name, i) { if (lower.indexOf(name) === 0) index = i; });
    return index;
  }

  function earliestStart(body) {
    var re = new RegExp(DATE_RANGE.source, 'gi');
    var earliest = null;
    var m;
    while ((m = re.exec(body)) !== null) {
      var start = m[1];
      var yearMatch = start.match(/(\d{4})/);
      if (!yearMatch) continue;
      var year = parseInt(yearMatch[1], 10);
      if (year < 1985 || year > new Date().getFullYear()) continue;
      var monthIndex = monthValue(start.replace(/\d{4}/, ''));
      var value = year + (monthIndex > 0 ? monthIndex / 12 : 0);
      if (earliest === null || value < earliest) earliest = value;
    }
    if (earliest === null) return 0;
    return Math.max(0, Math.round((new Date().getFullYear() + new Date().getMonth() / 12 - earliest) * 10) / 10);
  }

  function splitSections(body) {
    var lines = body.split(/\n/);
    var sections = { summary: [], skills: [], experience: [], projects: [], education: [], certifications: [], publications: [], additional: [], unassigned: [] };
    var current = 'unassigned';
    var inHeaderZone = true;
    lines.forEach(function (line, index) {
      var trimmed = line.trim();
      if (!trimmed) { if (current !== 'unassigned') sections[current].push(''); return; }
      var bare = trimmed.replace(/^[#•*\->\s]+/, '').replace(/[:|]+$/, '').trim();
      var matched = null;
      if (bare.length <= 46) {
        SECTION_HEADERS.some(function (header) {
          if (header.re.test(bare) && bare.length <= header.re.source.length + 26) { matched = header.key; return true; }
          return false;
        });
      }
      if (matched) {
        current = matched;
        inHeaderZone = false;
        return;
      }
      if (IGNORE_HEADINGS.test(bare)) { current = 'additional'; return; }
      sections[current].push(line);
      if (index > 6 && inHeaderZone) inHeaderZone = false;
    });
    Object.keys(sections).forEach(function (key) {
      sections[key] = sections[key].join('\n').replace(/\n{3,}/g, '\n\n').trim();
    });
    return sections;
  }

  function parseEmployment(experienceText) {
    var lines = experienceText.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var roles = [];
    lines.forEach(function (line) {
      var hasRange = DATE_RANGE.test(line);
      if (!hasRange) return;
      var cleaned = line.replace(/\|/g, ' | ').replace(/\s{2,}/g, ' ');
      var pieces = cleaned.split('|').map(function (p) { return p.trim(); }).filter(Boolean);
      var company = '', title = '', location = '', range = (cleaned.match(DATE_RANGE) || [''])[0];
      var ROLE_WORDS = /\b(engineer|administrator|admin|architect|analyst|consultant|specialist|manager|lead|scientist|developer|dba|head|director|associate|expert|partner)\b/i;
      var COMPANY_WORDS = /\b(ltd|limited|llp|inc|pvt|private|corporation|corp|group|technologies|technology|systems|solutions|services|labs|india|it|p\.?l\.?c)\b|\bat\s+[A-Z]/i;
      pieces.forEach(function (piece) {
        if (DATE_RANGE.test(piece) && !range) { range = piece; return; }
        if (!location && /(india|remote|bengaluru|bangalore|chennai|hyderabad|pune|mumbai|delhi|gurgaon|noida|kolkata|usa|uk|germany|singapore|dubai|europe)/i.test(piece) && !ROLE_WORDS.test(piece)) { location = piece; return; }
        if (!title && ROLE_WORDS.test(piece)) { title = piece; return; }
        if (!company && (COMPANY_WORDS.test(piece) || /^[A-Z]/.test(piece))) { company = piece; return; }
        if (!title) title = piece;
      });
      if (!company && !title) company = cleaned.replace(DATE_RANGE, '').replace(/[|,–—-]\s*$/, '').trim();
      roles.push({ title: title || company, company: company || '', location: location, range: range });
    });
    // Fallback for one-role-per-block layouts: look for "at Company" / "— Company" lines.
    if (!roles.length) {
      lines.forEach(function (line) {
        var m = line.match(/^((?:senior|lead|principal|staff|jr|junior|chief|head|it|cloud|infrastructure|platform|system|network|security|storage|virtualization|devops)?\s?[A-Za-z ]*(?:engineer|administrator|admin|architect|analyst|consultant|specialist|manager|lead|scientist))\b[^|]*[|@—\-]\s*([A-Z][A-Za-z0-9 .,&'-]{2,40})/);
        if (m) roles.push({ title: m[1].trim(), company: m[2].trim().replace(/[.,;]$/, ''), location: '', range: (line.match(DATE_RANGE) || [''])[0] });
      });
    }
    return roles.slice(0, 12);
  }

  function parseEducation(educationText, certificationsText) {
    var blob = (educationText + '\n' + certificationsText).toLowerCase();
    if (!/ph\.?d|master|b\.?(tech|e\b|sc|ca|mca)|diploma|12th|hsc/i.test(blob)) blob = blob + '\n';
    var degrees = [];
    [
      ['PhD / Doctorate', /\bph\.?d\b|doctorate/],
      ["Master's (M.Tech/MBA/MSc)", /\bm\.?(tech|ba|sc|ca|eng|tech)\b|master of/],
      ["Bachelor's (B.E/B.Tech/BCA/BSc)", /\bb\.?(e|tech|sc|ca|com|mca|cse|it)\b|bachelor of/],
      ['Diploma', /\bdiploma\b/],
      ['Higher secondary / +2', /\b(12th|hsc|higher secondary|class xii|\+2)\b/]
    ].forEach(function (row) {
      if (row[1].test(blob)) degrees.push(row[0]);
    });
    var institutions = (educationText.match(/[A-Z][A-Za-z .']{4,50}(?:University|Institute|College|School|IIT|NIT|Polytechnic)/g) || []).slice(0, 3);
    return { degrees: degrees, institutions: institutions };
  }

  function detectNotice(body) {
    var m = body.match(/notice\s*period\s*[:\-]?\s*([0-9]{1,2}\s*(?:day|week|month)s?|immediate|serving|negotiable|open)/i);
    return m ? m[1].trim() : '';
  }

  function detectExpectedCtc(body) {
    var m = body.match(/(?:expected|desired|asking)\s*(?:ctc|salary|compensation|pay)\s*[:\-]?\s*([^\n|]{2,40})/i);
    return m ? m[1].trim() : '';
  }

  function detectCurrentCtc(body) {
    var m = body.match(/(?:current|present)\s*(?:ctc|salary|compensation)\s*[:\-]?\s*([^\n|]{2,40})/i);
    return m ? m[1].trim() : '';
  }

  function detectVisa(body) {
    var m = body.match(/([A-Z]{2,4}\s*(?:visa|work permit))\b/i);
    return m ? m[1] : '';
  }

  function topAchievements(text) {
    var sentences = text.split(/\n|(?<=[.!?])\s+/)
      .map(function (s) { return s.replace(/^[\s•*\->·]+/, '').trim(); })
      .filter(function (s) { return s.length > 45 && s.length < 300; });
    var scored = sentences.map(function (sentence) {
      var score = 0;
      if (text_has_number(sentence)) score += 3;
      if (/\b(reduced|improved|cut|saved|avoided|migrated|automated|eliminated|scaled|led|built|designed|zero|100%|by \d)/i.test(sentence)) score += 2;
      if (/\b(responsible for|worked on|involved in|assisted)\b/i.test(sentence)) score -= 2;
      if (/\b\d{1,3}(,\d{3})+\b/.test(sentence)) score += 1;
      return { sentence: sentence, score: score };
    }).filter(function (item) { return item.score >= 3; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 6).map(function (item) { return item.sentence; });
  }

  function text_has_number(sentence) {
    return /\d/.test(sentence);
  }

  /**
   * ATS-style readiness checks. Deliberately heuristic and transparent: each check
   * says what it looked for, so the advice can be argued with.
   */
  function atsReview(profile, rawText) {
    var body = rawText || '';
    var words = (body.match(/[A-Za-z][A-Za-z+#.\-/]*/g) || []).length;
    var lines = body.split(/\n/).filter(function (l) { return l.trim(); });
    var bulletish = lines.filter(function (l) { return /^\s*[•*\-–—>·]\s+/.test(l) || /^(?:-\s)/.test(l); }).length;
    var quantified = (body.match(/\b\d+(?:\.\d+)?\s*(?:%|percent|k|m|bn|hrs?|hours?|days?|weeks?|months?|years?|nodes?|servers?|vms?|users?|tickets?|tb|gb|crore|lakh|₹|\$)/gi) || []).length;
    var checks = [];
    function add(label, passed, points, advice) {
      checks.push({ label: label, passed: !!passed, points: points, earned: passed ? points : 0, advice: passed ? '' : advice });
    }
    add('Contact block has email', !!profile.email, 8, 'Add a personal email address on page 1 — recruiters and parsers both look there.');
    add('Contact block has phone', !!profile.phone, 5, 'Add a phone number with country code (+91 …).');
    add('LinkedIn or portfolio URL', !!(profile.linkedin || profile.website), 6, 'One professional URL is enough. Put it beside your email.');
    add('Years-of-experience line', profile.years > 0, 8, 'Write "19+ years of experience" in the summary — many boolean searches filter on it.');
    var sectionBlob = profile.sections || {};
    add('Skills section present', (sectionBlob.skills || '').length > 40, 10, 'Add a compact "Technical Skills" block grouped by category; ATS keyword matchers read it first.');
    add('Employment dates parse', profile.employment.length > 0, 9, 'Use "Month YYYY – Month YYYY | Title | Company" on one line so parsers can compute tenure.');
    add('Quantified achievements', quantified >= 4, 12, 'Turn duties into results: "cut patch window from 6h to 40min across 320 RHEL hosts". ' + quantified + ' quantified line(s) found, aim for 4+.');
    add('Bullet-style writing', bulletish >= 6, 6, 'Use dashes/bullets instead of paragraphs — most ATSes keep bullets, most readers skip prose.');
    var lengthOk = words >= 320 && words <= 1100;
    add('Length in the 1-2 page sweet spot', lengthOk, 8, words < 320 ? 'Resume is thin (' + words + ' words). Add scope numbers: hosts, users, uptime, team size.' : 'Resume is long (' + words + ' words). Trim to the last 12 years and one page per 6 years.');
    var noTables = !/\t.*\t.*\t/.test(body);
    add('No multi-column table layout', noTables, 6, 'Two-column tables scramble in an ATS. Use headings and a single column.');
    var passive = (body.match(/\b(responsible for|worked on|involved in|assisted in|participated in)\b/gi) || []).length;
    add('Action verbs, not duty phrases', passive <= 3, 6, 'Replace "responsible for X" with "owned / delivered / automated X". ' + passive + ' duty phrase(s) found.');
    var missing = (sectionBlob.summary || '').length < 60 ? 1 : 0;
    add('Opening summary of 2-4 lines', !missing, 6, 'A 2-4 line summary with your title, stack and domain tells the screener which box to put you in.');
    var total = checks.reduce(function (sum, c) { return sum + c.earned; }, 0);
    var max = checks.reduce(function (sum, c) { return sum + c.points; }, 0);
    return {
      score: Math.round((total / max) * 100),
      words: words,
      quantified: quantified,
      bullets: bulletish,
      dutyPhrases: passive,
      checks: checks,
      verdict: total / max >= 0.85 ? 'Parse-ready' : total / max >= 0.65 ? 'Workable, fix the red items' : 'Fix before mass-applying'
    };
  }

  /** Turn raw resume text into the profile object the whole tool works from. */
  function parse(rawText, options) {
    var opts = options || {};
    var body = text.normalize(rawText || '');
    var sections = splitSections(body);
    var contact = parseContact(body);
    var years = parseYears(body);
    var skillBlob = [sections.skills, sections.summary, sections.experience, sections.projects, body].join('\n\n');
    var detected = skills.extract(skillBlob || body);
    // Many real CVs have no "Experience" heading at all — the roles just start. Falling
    // back to the whole document for employment/achievement mining is what makes the tool
    // work on an unstyled CV instead of returning an empty profile.
    var experienceForEvidence = (sections.experience || '').length > 40 ? sections.experience : body;
    var experienceIsFallback = (sections.experience || '').length <= 40;
    var detectedInExperience = skills.extract(experienceForEvidence);
    var list = detected.skills.map(function (entry) {
      var proven = detectedInExperience.byName[entry.name];
      return {
        name: entry.name,
        category: entry.category,
        weight: entry.weight,
        mentions: entry.mentions,
        evidence: entry.evidence,
        lab: entry.lab,
        usedInWorkHistory: !!proven
      };
    });
    var headline = '';
    var headLines = body.split(/\n/).slice(0, 8);
    headLines.some(function (line) {
      if (/engineer|administrator|architect|analyst|consultant|manager|lead|specialist|developer|admin\b/i.test(line) && line.length < 80 && !/experience|summary/i.test(line)) {
        headline = line.replace(/^[#•*\->\s]+/, '').trim();
        return true;
      }
      return false;
    });
    var profile = {
      version: 1,
      source: opts.source || 'pasted text',
      parsedAt: new Date().toISOString(),
      name: opts.name || firstMeaningfulLine(body.split(/\n/).slice(0, 6)) || '',
      headline: headline || (list.length ? list.slice(0, 3).map(function (s) { return s.name; }).join(' / ') + ' specialist' : ''),
      email: contact.email,
      phone: contact.phone,
      linkedin: contact.linkedin,
      github: contact.github,
      website: contact.website,
      location: contact.location,
      noticePeriod: detectNotice(body),
      expectedCtc: detectExpectedCtc(body),
      currentCtc: detectCurrentCtc(body),
      visa: detectVisa(body),
      years: years.years,
      yearsExplicit: years.explicit,
      yearsDerived: years.derived,
      raw: body,
      sections: sections,
      skills: list,
      certifications: skills.certHits(body),
      education: parseEducation(sections.education, sections.certifications),
      employment: parseEmployment(experienceForEvidence),
      achievements: topAchievements(experienceForEvidence + '\n' + sections.projects + '\n' + sections.summary),
      experienceSource: experienceIsFallback ? 'no experience heading found — read from the whole document' : 'experience section',
      ats: null
    };
    // "Senior/Lead/Architect" seniority band for scoring, from title words + years.
    var levelInfo = skills.classifyTitle((profile.headline || '') + ' ' + (profile.employment[0] ? profile.employment[0].title : ''));
    profile.seniority = levelInfo.level || 3;
    if (profile.years >= 16) profile.seniority = Math.max(profile.seniority, 5);
    else if (profile.years >= 10) profile.seniority = Math.max(profile.seniority, 4);
    else if (profile.years >= 5) profile.seniority = Math.max(profile.seniority, 3);
    else if (profile.years >= 2) profile.seniority = Math.max(profile.seniority, 2);
    profile.ats = atsReview(profile, body);
    return profile;
  }

  function skillNames(profile) {
    return (profile && profile.skills ? profile.skills : []).map(function (s) { return s.name; });
  }

  /** Weighted skill map: {name: weight 1..3} honouring user include/exclude toggles. */
  function skillWeights(profile) {
    var map = Object.create(null);
    (profile.skills || []).forEach(function (entry) {
      if (entry.excluded) return;
      map[entry.name] = Math.min(3, entry.weight + (entry.usedInWorkHistory ? 1 : 0) * 0.5);
    });
    return map;
  }

  return {
    atsReview: atsReview,
    docxToText: docxToText,
    extract: parse,
    parse: parse,
    extractFromFile: extractFromFile,
    parseContact: parseContact,
    parseEducation: parseEducation,
    parseEmployment: parseEmployment,
    parseYears: parseYears,
    pdfLooksBroken: pdfLooksBroken,
    pdfToText: pdfToText,
    rtfToText: rtfToText,
    skillNames: skillNames,
    skillWeights: skillWeights,
    splitSections: splitSections
  };
}));
