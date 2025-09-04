# 북한 주요 관리소 수감 인원 추정치 (2020–2025)

React로 제작된 북한 관리소별 수감 인원 데이터 시각화 인터랙티브 컴포넌트입니다.

## 실행 방법

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   브라우저에서 http://localhost:3000 으로 자동 열림

3. **빌드 (배포용)**
   ```bash
   npm run build
   ```
   `dist/` 폴더에 빌드 파일 생성

## 주요 기능

- **관리소별 라인차트**: 6개 관리소의 시계열 추세
- **합계 바차트**: 전체 합계와 전년대비 증감률 표시  
- **데이터 테이블**: 수치 표 형태로 표시
- **인터랙티브 기능**:
  - 관리소별 데이터 토글 (선택/해제)
  - 정규화 모드 (2020-03 = 100 기준)
  - 격자선 표시/숨김
  - CSV 내보내기

## 기술 스택

- React 18 + TypeScript
- Vite (빌드 도구)
- Recharts (차트 라이브러리)
- Tailwind CSS (스타일링)
- 색각친화적 팔레트 (Okabe-Ito)

## 파일 구조

```
├── src/
│   ├── main.tsx          # 앱 진입점
│   └── index.css         # 전역 스타일
├── NKCampInteractive.tsx # 메인 컴포넌트
├── index.html           # HTML 템플릿
└── package.json         # 프로젝트 설정
```