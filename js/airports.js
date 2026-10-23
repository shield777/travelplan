/*
 * 공항·항공사 기본 데이터
 * - 터미널, 주차장, 팁은 2026년 10월 기준으로 정리했어요.
 * - 게이트는 출발 당일 배정·변경되므로 앱에는 "직접 입력 + 실시간 확인 링크"로 제공합니다.
 * - 요금·잔여 주차면·운영시간처럼 자주 바뀌는 정보는 넣지 않고 공식 사이트 링크로 대신합니다.
 */
(function () {
  const KR = '대한민국';

  const AIRPORTS = [
    // ───────── 대한민국 ─────────
    {
      code: 'ICN', ko: '인천국제공항', en: 'Incheon International Airport', city: '인천', country: KR, tz: 'Asia/Seoul',
      terminals: ['T1', 'T2'], site: 'https://www.airport.kr',
      notes: [
        'T1 ↔ T2는 무료 순환버스로 약 15~20분 걸려요. 터미널을 잘못 가면 시간이 많이 들어요.',
        'T2 이용: 대한항공·진에어·아시아나(2026.1.14~)·에어서울·에어부산·델타·에어프랑스·KLM 등. 그 외 항공사는 대부분 T1이에요.',
        '공동운항(코드셰어)은 항공권에 적힌 항공사가 아니라 실제 운항 항공사의 터미널로 가야 해요.',
        'T1의 101~132번 게이트는 탑승동이에요. 출국심사 뒤 셔틀트레인을 타야 해서 시간이 더 필요해요.'
      ],
      // term: 그 터미널 항공편일 때만 먼저 보여 줌 / res: 예약 전용
      parking: [
        { term: 'T1', name: 'T1 단기주차장', desc: '터미널 바로 앞. 배웅이나 짧은 이용에 좋아요. 여러 날 세우면 비싸요.', q: '인천공항 제1여객터미널 단기주차장' },
        { term: 'T1', name: 'T1 장기주차장 P1', desc: '장기주차장. 셔틀버스로 터미널까지 이동해요.', q: '인천공항 제1여객터미널 장기주차장 P1' },
        { term: 'T1', name: 'T1 장기주차장 P2', desc: '장기주차장. 셔틀버스로 터미널까지 이동해요.', q: '인천공항 제1여객터미널 장기주차장 P2' },
        { term: 'T1', name: 'T1 장기주차장 P3', desc: '장기주차장. 카드 결제 전용이에요.', q: '인천공항 제1여객터미널 장기주차장 P3' },
        { term: 'T1', name: 'T1 장기주차장 P4', desc: '장기주차장. 셔틀버스로 터미널까지 이동해요.', q: '인천공항 제1여객터미널 장기주차장 P4' },
        { term: 'T1', res: true, name: 'T1 P5 예약주차장', desc: '미리 예약한 차만 들어가요. 제1·제2터미널행 셔틀버스가 다녀요.', q: '인천공항 P5 예약주차장' },
        { term: 'T2', name: 'T2 단기주차장', desc: '터미널 남쪽, 바로 앞. 짧은 이용 위주예요.', q: '인천공항 제2여객터미널 단기주차장' },
        { term: 'T2', res: true, name: 'T2 예약주차장', desc: '장기주차장 북서쪽(서편 예약주차장1 · 동편 예약주차장2). 미리 예약한 차만 들어가요. 셔틀버스로 이동해요.', q: '인천공항 제2여객터미널 예약주차장' },
        { term: 'T2', name: 'T2 장기주차장', desc: '터미널 북쪽 야외 주차장. 셔틀버스로 이동해요.', q: '인천공항 제2여객터미널 장기주차장' },
        { term: 'T2', name: 'T2 주차타워', desc: '남측·북측 주차타워(장기). 셔틀버스로 이동해요.', q: '인천공항 제2여객터미널 주차타워' },
        { name: '주차대행(발렛)', desc: '터미널 앞에서 차를 맡기는 유료 서비스. 짐이 많거나 아이와 함께일 때 편해요.', q: '인천공항 주차대행' }
      ],
      parkingRes: '입차 45일 전부터 4시간 전까지 예약 · 주차 기간 1일 이상 30일 미만 · 예정 시간 앞뒤 4시간 안에 입차 · 그 안에 안 들어가면 자동 취소 · 높이 2.8m 이상 차량은 이용 불가',
      parkingLinks: [
        ['T1 주차 안내·예약', 'https://www.airport.kr/ap_ko/957/subview.do'],
        ['T2 주차 안내·예약', 'https://www.airport.kr/ap_ko/958/subview.do'],
        ['장기주차장 혼잡도', 'https://www.airport.kr/ap_ko/965/subview.do']
      ],
      parkingNote: '연휴·방학에는 장기주차장과 예약주차장이 일찍 차요. 요금과 남은 자리는 공식 사이트에서 확인하세요.'
    },
    {
      code: 'GMP', ko: '김포국제공항', en: 'Gimpo International Airport', city: '서울', country: KR, tz: 'Asia/Seoul',
      terminals: ['국내선', '국제선'], site: 'https://www.airport.co.kr/gimpo',
      notes: ['국내선과 국제선 청사가 떨어져 있어요. 항공권의 출발 청사를 꼭 확인하세요.'],
      parking: [
        { name: '국내선 주차장', desc: '국내선 청사 앞 주차장.', q: '김포공항 국내선 주차장' },
        { name: '국제선 주차장', desc: '국제선 청사 앞 주차장.', q: '김포공항 국제선 주차장' }
      ],
      parkingNote: '주말·연휴엔 만차가 잦아요. 예약주차 가능 여부와 요금은 한국공항공사 사이트에서 확인하세요.'
    },
    {
      code: 'PUS', ko: '김해국제공항', en: 'Gimhae International Airport', city: '부산', country: KR, tz: 'Asia/Seoul',
      terminals: ['국내선', '국제선'], site: 'https://www.airport.co.kr/gimhae',
      notes: ['국내선과 국제선 청사가 나뉘어 있어요.'],
      parking: [
        { name: '국내선 주차장', desc: '국내선 청사 이용 시.', q: '김해공항 국내선 주차장' },
        { name: '국제선 주차장', desc: '국제선 청사 이용 시.', q: '김해공항 국제선 주차장' }
      ],
      parkingNote: '주차 혼잡이 심한 공항이에요. 출발 전 실시간 주차 현황을 확인하세요.'
    },
    {
      code: 'CJU', ko: '제주국제공항', en: 'Jeju International Airport', city: '제주', country: KR, tz: 'Asia/Seoul',
      terminals: ['국내선', '국제선'], site: 'https://www.airport.co.kr/jeju',
      notes: ['렌터카는 공항 밖 렌터카 하우스에서 셔틀로 이동하는 경우가 많아요.'],
      parking: [{ name: '제주공항 주차장', desc: '공항 청사 앞 주차장.', q: '제주공항 주차장' }],
      parkingNote: '요금과 혼잡도는 한국공항공사 사이트에서 확인하세요.'
    },
    { code: 'CJJ', ko: '청주국제공항', en: 'Cheongju International Airport', city: '청주', country: KR, tz: 'Asia/Seoul', terminals: [], site: 'https://www.airport.co.kr/cheongju',
      parking: [{ name: '청주공항 주차장', desc: '공항 주차장.', q: '청주공항 주차장' }] },
    { code: 'TAE', ko: '대구국제공항', en: 'Daegu International Airport', city: '대구', country: KR, tz: 'Asia/Seoul', terminals: [], site: 'https://www.airport.co.kr/daegu',
      parking: [{ name: '대구공항 주차장', desc: '공항 주차장.', q: '대구공항 주차장' }] },
    { code: 'MWX', ko: '무안국제공항', en: 'Muan International Airport', city: '무안', country: KR, tz: 'Asia/Seoul', terminals: [], site: 'https://www.airport.co.kr/muan',
      parking: [{ name: '무안공항 주차장', desc: '공항 주차장.', q: '무안공항 주차장' }] },

    // ───────── 일본 ─────────
    { code: 'NRT', ko: '나리타국제공항', en: 'Narita International Airport', city: '도쿄', country: '일본', tz: 'Asia/Tokyo', terminals: ['T1', 'T2', 'T3'], site: 'https://www.narita-airport.jp',
      notes: ['도쿄 시내까지 1시간 이상 걸려요. 스카이라이너·N\'EX·리무진버스 중 선택.', '저가항공(제트스타·피치 등)은 T3를 쓰는 경우가 많아요.'] },
    { code: 'HND', ko: '하네다공항', en: 'Tokyo Haneda Airport', city: '도쿄', country: '일본', tz: 'Asia/Tokyo', terminals: ['T1', 'T2', 'T3'], site: 'https://tokyo-haneda.com',
      notes: ['국제선은 주로 T3, 일부 국제선은 T2를 써요.', '도심까지 모노레일·게이큐선으로 30분 안팎.'] },
    { code: 'KIX', ko: '간사이국제공항', en: 'Kansai International Airport', city: '오사카', country: '일본', tz: 'Asia/Tokyo', terminals: ['T1', 'T2'], site: 'https://www.kansai-airport.or.jp',
      notes: ['T2는 저가항공 전용이에요. T1과 무료 셔틀버스로 연결돼요.', '오사카 시내까지 난카이 라피트·JR 하루카로 약 40~50분.'] },
    { code: 'ITM', ko: '오사카 이타미공항', en: 'Osaka Itami Airport', city: '오사카', country: '일본', tz: 'Asia/Tokyo', terminals: [] , notes: ['주로 일본 국내선 공항이에요.'] },
    { code: 'NGO', ko: '주부국제공항', en: 'Chubu Centrair International Airport', city: '나고야', country: '일본', tz: 'Asia/Tokyo', terminals: ['T1', 'T2'], site: 'https://www.centrair.jp' },
    { code: 'FUK', ko: '후쿠오카공항', en: 'Fukuoka Airport', city: '후쿠오카', country: '일본', tz: 'Asia/Tokyo', terminals: ['국내선', '국제선'], site: 'https://www.fukuoka-airport.jp',
      notes: ['국제선 터미널과 국내선 터미널은 무료 셔틀버스로 연결돼요.', '하카타역까지 가깝지만 국제선 쪽에서는 버스를 타야 해요.'] },
    { code: 'CTS', ko: '신치토세공항', en: 'New Chitose Airport', city: '삿포로', country: '일본', tz: 'Asia/Tokyo', terminals: ['국내선', '국제선'], site: 'https://www.new-chitose-airport.jp',
      notes: ['삿포로역까지 JR 쾌속 에어포트로 약 40분.'] },
    { code: 'OKA', ko: '나하공항', en: 'Naha Airport', city: '오키나와', country: '일본', tz: 'Asia/Tokyo', terminals: [], notes: ['렌터카는 공항 밖 영업소로 셔틀 이동하는 경우가 많아요.'] },

    // ───────── 중화권 ─────────
    { code: 'TPE', ko: '타오위안국제공항', en: 'Taiwan Taoyuan International Airport', city: '타이베이', country: '대만', tz: 'Asia/Taipei', terminals: ['T1', 'T2'], site: 'https://www.taoyuan-airport.com',
      notes: ['타이베이 시내까지 공항 MRT로 약 40분.'] },
    { code: 'TSA', ko: '쑹산공항', en: 'Taipei Songshan Airport', city: '타이베이', country: '대만', tz: 'Asia/Taipei', terminals: [], notes: ['김포 노선이 다녀요. 시내 MRT역과 바로 연결돼요.'] },
    { code: 'KHH', ko: '가오슝국제공항', en: 'Kaohsiung International Airport', city: '가오슝', country: '대만', tz: 'Asia/Taipei', terminals: [] },
    { code: 'HKG', ko: '홍콩국제공항', en: 'Hong Kong International Airport', city: '홍콩', country: '홍콩', tz: 'Asia/Hong_Kong', terminals: ['T1'], site: 'https://www.hongkongairport.com',
      notes: ['시내까지 공항고속철(AEL)로 약 25분.'] },
    { code: 'MFM', ko: '마카오국제공항', en: 'Macau International Airport', city: '마카오', country: '마카오', tz: 'Asia/Macau', terminals: [] },
    { code: 'PVG', ko: '상하이 푸둥국제공항', en: 'Shanghai Pudong International Airport', city: '상하이', country: '중국', tz: 'Asia/Shanghai', terminals: ['T1', 'T2'] },
    { code: 'PEK', ko: '베이징 서우두국제공항', en: 'Beijing Capital International Airport', city: '베이징', country: '중국', tz: 'Asia/Shanghai', terminals: ['T2', 'T3'] },
    { code: 'PKX', ko: '베이징 다싱국제공항', en: 'Beijing Daxing International Airport', city: '베이징', country: '중국', tz: 'Asia/Shanghai', terminals: [] },
    { code: 'TAO', ko: '칭다오 자오둥국제공항', en: 'Qingdao Jiaodong International Airport', city: '칭다오', country: '중국', tz: 'Asia/Shanghai', terminals: [] },

    // ───────── 동남아 ─────────
    { code: 'BKK', ko: '수완나품국제공항', en: 'Suvarnabhumi Airport', city: '방콕', country: '태국', tz: 'Asia/Bangkok', terminals: [],
      notes: ['방콕에는 공항이 2개(BKK·DMK)예요. 저가항공은 돈므앙(DMK)인 경우가 많아요.', '시내까지 공항철도(ARL)로 약 30분.'] },
    { code: 'DMK', ko: '돈므앙국제공항', en: 'Don Mueang International Airport', city: '방콕', country: '태국', tz: 'Asia/Bangkok', terminals: ['T1', 'T2'], notes: ['T1 국제선, T2 국내선.'] },
    { code: 'HKT', ko: '푸껫국제공항', en: 'Phuket International Airport', city: '푸껫', country: '태국', tz: 'Asia/Bangkok', terminals: [] },
    { code: 'CNX', ko: '치앙마이국제공항', en: 'Chiang Mai International Airport', city: '치앙마이', country: '태국', tz: 'Asia/Bangkok', terminals: [] },
    { code: 'DAD', ko: '다낭국제공항', en: 'Da Nang International Airport', city: '다낭', country: '베트남', tz: 'Asia/Ho_Chi_Minh', terminals: ['T1', 'T2'], notes: ['T1 국내선, T2 국제선.', '시내·해변 호텔까지 차로 15~20분 정도로 가까워요.'] },
    { code: 'CXR', ko: '깜라인국제공항', en: 'Cam Ranh International Airport', city: '나트랑', country: '베트남', tz: 'Asia/Ho_Chi_Minh', terminals: ['T1', 'T2'], notes: ['T2 국제선. 나트랑 시내까지 차로 약 40분.'] },
    { code: 'PQC', ko: '푸꾸옥국제공항', en: 'Phu Quoc International Airport', city: '푸꾸옥', country: '베트남', tz: 'Asia/Ho_Chi_Minh', terminals: [] },
    { code: 'SGN', ko: '떤선녓국제공항', en: 'Tan Son Nhat International Airport', city: '호찌민', country: '베트남', tz: 'Asia/Ho_Chi_Minh', terminals: [] },
    { code: 'HAN', ko: '노이바이국제공항', en: 'Noi Bai International Airport', city: '하노이', country: '베트남', tz: 'Asia/Ho_Chi_Minh', terminals: ['T1', 'T2'], notes: ['T1 국내선, T2 국제선.'] },
    { code: 'MNL', ko: '니노이 아키노국제공항', en: 'Ninoy Aquino International Airport', city: '마닐라', country: '필리핀', tz: 'Asia/Manila', terminals: ['T1', 'T2', 'T3'], notes: ['터미널 간 거리가 멀고 교통 체증이 심해요. 환승 시간을 넉넉히 잡으세요.'] },
    { code: 'CEB', ko: '막탄세부국제공항', en: 'Mactan-Cebu International Airport', city: '세부', country: '필리핀', tz: 'Asia/Manila', terminals: ['T1', 'T2'], notes: ['T1 국내선, T2 국제선.'] },
    { code: 'CRK', ko: '클락국제공항', en: 'Clark International Airport', city: '클락', country: '필리핀', tz: 'Asia/Manila', terminals: [] },
    { code: 'SIN', ko: '창이국제공항', en: 'Singapore Changi Airport', city: '싱가포르', country: '싱가포르', tz: 'Asia/Singapore', terminals: ['T1', 'T2', 'T3', 'T4'], site: 'https://www.changiairport.com',
      notes: ['T1~T3는 스카이트레인으로 연결, T4는 셔틀버스로 이동해요.', '쥬얼(Jewel)은 T1과 바로 연결돼요.'] },
    { code: 'KUL', ko: '쿠알라룸푸르국제공항', en: 'Kuala Lumpur International Airport', city: '쿠알라룸푸르', country: '말레이시아', tz: 'Asia/Kuala_Lumpur', terminals: ['T1', 'T2'], notes: ['에어아시아는 T2를 써요.'] },
    { code: 'BKI', ko: '코타키나발루국제공항', en: 'Kota Kinabalu International Airport', city: '코타키나발루', country: '말레이시아', tz: 'Asia/Kuching', terminals: [] },
    { code: 'DPS', ko: '응우라라이국제공항', en: 'I Gusti Ngurah Rai International Airport', city: '발리', country: '인도네시아', tz: 'Asia/Makassar', terminals: ['국내선', '국제선'], notes: ['발리는 자카르타보다 1시간 빨라요(UTC+8).'] },
    { code: 'CGK', ko: '수카르노하타국제공항', en: 'Soekarno-Hatta International Airport', city: '자카르타', country: '인도네시아', tz: 'Asia/Jakarta', terminals: ['T1', 'T2', 'T3'] },
    { code: 'UBN', ko: '칭기스칸국제공항', en: 'Chinggis Khaan International Airport', city: '울란바토르', country: '몽골', tz: 'Asia/Ulaanbaatar', terminals: [] },

    // ───────── 태평양·미주 ─────────
    { code: 'GUM', ko: '괌 국제공항', en: 'Antonio B. Won Pat International Airport', city: '괌', country: '미국(괌)', tz: 'Pacific/Guam', terminals: [], notes: ['미국령이라 ESTA 또는 괌-CNMI 비자면제 프로그램 조건을 확인하세요.'] },
    { code: 'SPN', ko: '사이판 국제공항', en: 'Saipan International Airport', city: '사이판', country: '미국(사이판)', tz: 'Pacific/Saipan', terminals: [] },
    { code: 'HNL', ko: '다니엘 K. 이노우에 국제공항', en: 'Daniel K. Inouye International Airport', city: '호놀룰루', country: '미국', tz: 'Pacific/Honolulu', terminals: ['T1', 'T2'], notes: ['미국 입국은 ESTA가 필요해요(무비자 대상자 기준).'] },
    { code: 'LAX', ko: 'LA 국제공항', en: 'Los Angeles International Airport', city: '로스앤젤레스', country: '미국', tz: 'America/Los_Angeles', terminals: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'TBIT'], site: 'https://www.flylax.com',
      notes: ['국제선은 대부분 톰 브래들리 국제선 터미널(TBIT)이에요.'] },
    { code: 'SFO', ko: '샌프란시스코 국제공항', en: 'San Francisco International Airport', city: '샌프란시스코', country: '미국', tz: 'America/Los_Angeles', terminals: ['T1', 'T2', 'T3', 'International'], site: 'https://www.flysfo.com' },
    { code: 'SEA', ko: '시애틀 타코마 국제공항', en: 'Seattle-Tacoma International Airport', city: '시애틀', country: '미국', tz: 'America/Los_Angeles', terminals: [] },
    { code: 'LAS', ko: '해리 리드 국제공항', en: 'Harry Reid International Airport', city: '라스베이거스', country: '미국', tz: 'America/Los_Angeles', terminals: ['T1', 'T3'] },
    { code: 'JFK', ko: '존 F. 케네디 국제공항', en: 'John F. Kennedy International Airport', city: '뉴욕', country: '미국', tz: 'America/New_York', terminals: ['T1', 'T4', 'T5', 'T7', 'T8'], notes: ['터미널 간 이동은 에어트레인을 이용해요.'] },
    { code: 'YVR', ko: '밴쿠버 국제공항', en: 'Vancouver International Airport', city: '밴쿠버', country: '캐나다', tz: 'America/Vancouver', terminals: [], site: 'https://www.yvr.ca', notes: ['캐나다 입국은 eTA가 필요해요.'] },
    { code: 'YYZ', ko: '토론토 피어슨 국제공항', en: 'Toronto Pearson International Airport', city: '토론토', country: '캐나다', tz: 'America/Toronto', terminals: ['T1', 'T3'] },

    // ───────── 유럽·중동 ─────────
    { code: 'CDG', ko: '파리 샤를드골공항', en: 'Paris Charles de Gaulle Airport', city: '파리', country: '프랑스', tz: 'Europe/Paris', terminals: ['T1', 'T2A', 'T2B', 'T2C', 'T2D', 'T2E', 'T2F', 'T2G', 'T3'],
      notes: ['T2는 A~G로 나뉘고 서로 멀어요. 항공권의 세부 터미널(예: 2E)을 꼭 확인하세요.'] },
    { code: 'LHR', ko: '런던 히드로공항', en: 'London Heathrow Airport', city: '런던', country: '영국', tz: 'Europe/London', terminals: ['T2', 'T3', 'T4', 'T5'], site: 'https://www.heathrow.com', notes: ['영국 입국은 ETA가 필요해요.'] },
    { code: 'FRA', ko: '프랑크푸르트공항', en: 'Frankfurt Airport', city: '프랑크푸르트', country: '독일', tz: 'Europe/Berlin', terminals: ['T1', 'T2'], site: 'https://www.frankfurt-airport.com', notes: ['T1↔T2는 스카이라인 열차로 이동해요.'] },
    { code: 'MUC', ko: '뮌헨공항', en: 'Munich Airport', city: '뮌헨', country: '독일', tz: 'Europe/Berlin', terminals: ['T1', 'T2'] },
    { code: 'AMS', ko: '암스테르담 스히폴공항', en: 'Amsterdam Airport Schiphol', city: '암스테르담', country: '네덜란드', tz: 'Europe/Amsterdam', terminals: [], site: 'https://www.schiphol.nl' },
    { code: 'FCO', ko: '로마 피우미치노공항', en: 'Rome Fiumicino Airport', city: '로마', country: '이탈리아', tz: 'Europe/Rome', terminals: ['T1', 'T3'] },
    { code: 'MXP', ko: '밀라노 말펜사공항', en: 'Milan Malpensa Airport', city: '밀라노', country: '이탈리아', tz: 'Europe/Rome', terminals: ['T1', 'T2'] },
    { code: 'BCN', ko: '바르셀로나 엘프라트공항', en: 'Barcelona-El Prat Airport', city: '바르셀로나', country: '스페인', tz: 'Europe/Madrid', terminals: ['T1', 'T2'] },
    { code: 'MAD', ko: '마드리드 바라하스공항', en: 'Adolfo Suárez Madrid-Barajas Airport', city: '마드리드', country: '스페인', tz: 'Europe/Madrid', terminals: ['T1', 'T2', 'T3', 'T4', 'T4S'] },
    { code: 'ZRH', ko: '취리히공항', en: 'Zurich Airport', city: '취리히', country: '스위스', tz: 'Europe/Zurich', terminals: [] },
    { code: 'VIE', ko: '빈 국제공항', en: 'Vienna International Airport', city: '빈', country: '오스트리아', tz: 'Europe/Vienna', terminals: ['T1', 'T3'] },
    { code: 'PRG', ko: '프라하 바츨라프하벨공항', en: 'Václav Havel Airport Prague', city: '프라하', country: '체코', tz: 'Europe/Prague', terminals: ['T1', 'T2'] },
    { code: 'IST', ko: '이스탄불공항', en: 'Istanbul Airport', city: '이스탄불', country: '튀르키예', tz: 'Europe/Istanbul', terminals: [], notes: ['터미널이 매우 넓어 게이트까지 20분 이상 걸을 수 있어요.'] },
    { code: 'DXB', ko: '두바이국제공항', en: 'Dubai International Airport', city: '두바이', country: '아랍에미리트', tz: 'Asia/Dubai', terminals: ['T1', 'T2', 'T3'], notes: ['에미레이트항공은 T3를 써요.'] },
    { code: 'DOH', ko: '하마드국제공항', en: 'Hamad International Airport', city: '도하', country: '카타르', tz: 'Asia/Qatar', terminals: [] },

    // ───────── 오세아니아 ─────────
    { code: 'SYD', ko: '시드니공항', en: 'Sydney Airport', city: '시드니', country: '호주', tz: 'Australia/Sydney', terminals: ['T1', 'T2', 'T3'], notes: ['T1 국제선, T2·T3 국내선. 국제선↔국내선은 기차나 셔틀로 이동해요.', '호주 입국은 ETA가 필요해요.'] },
    { code: 'BNE', ko: '브리즈번공항', en: 'Brisbane Airport', city: '브리즈번', country: '호주', tz: 'Australia/Brisbane', terminals: ['국제선', '국내선'] },
    { code: 'AKL', ko: '오클랜드공항', en: 'Auckland Airport', city: '오클랜드', country: '뉴질랜드', tz: 'Pacific/Auckland', terminals: ['국제선', '국내선'], notes: ['뉴질랜드 입국은 NZeTA가 필요해요.'] }
  ];

  const AIRLINES = {
    KE: '대한항공', OZ: '아시아나항공', '7C': '제주항공', LJ: '진에어', TW: '티웨이항공', BX: '에어부산', RS: '에어서울',
    ZE: '이스타항공', YP: '에어프레미아', RF: '에어로케이', '4V': '플라이강원',
    JL: '일본항공', NH: '전일본공수(ANA)', MM: '피치항공', GK: '젯스타재팬', BC: '스카이마크',
    CI: '중화항공', BR: '에바항공', JX: '스타럭스', IT: '타이거에어 타이완', CX: '캐세이퍼시픽', UO: '홍콩익스프레스', HX: '홍콩항공',
    CA: '중국국제항공', MU: '중국동방항공', CZ: '중국남방항공', SC: '산둥항공', MF: '샤먼항공',
    SQ: '싱가포르항공', TR: '스쿠트', TG: '타이항공', FD: '타이에어아시아', VN: '베트남항공', VJ: '비엣젯', QH: '뱀부항공',
    PR: '필리핀항공', '5J': '세부퍼시픽', Z2: '필리핀에어아시아', MH: '말레이시아항공', AK: '에어아시아', D7: '에어아시아X', GA: '가루다인도네시아', OM: '몽골항공(MIAT)',
    DL: '델타항공', UA: '유나이티드항공', AA: '아메리칸항공', HA: '하와이안항공', AC: '에어캐나다',
    AF: '에어프랑스', KL: 'KLM', LH: '루프트한자', BA: '영국항공', AY: '핀에어', LO: '폴란드항공', TK: '터키항공', EK: '에미레이트항공', QR: '카타르항공', EY: '에티하드항공',
    QF: '콴타스', NZ: '에어뉴질랜드', JQ: '젯스타'
  };

  // 인천공항 제2터미널 이용 항공사 (2026.1.14 아시아나 이전 반영, 확인된 항공사만)
  const ICN_T2 = new Set(['KE', 'LJ', 'OZ', 'RS', 'BX', 'DL', 'AF', 'KL']);

  const COUNTRY_LIST = Array.from(new Set(AIRPORTS.map(a => a.country.replace(/\(.*\)/, '')))).concat(['베트남', '라오스', '캄보디아', '인도', '이집트', '그리스', '포르투갈', '헝가리', '크로아티아']);

  window.TP_DATA = { AIRPORTS, AIRLINES, ICN_T2, COUNTRY_LIST: Array.from(new Set(COUNTRY_LIST)) };
})();
