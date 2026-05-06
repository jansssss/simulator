# 백엔드 설치 가이드

## 1단계 — Python 패키지 설치
```bash
cd D:/simulator/backend
pip install -r requirements.txt
```

## 2단계 — AutoDock Vina 설치
https://vina.scripps.edu/downloads/ 에서 Windows 버전 다운로드
→ `vina.exe`를 시스템 PATH에 추가하거나 `backend/` 폴더에 복사

설치 확인:
```bash
vina --version
```

## 3단계 — 백엔드 서버 실행
```bash
python main.py
# 또는
start.bat 더블클릭
```
→ http://localhost:8000/docs 에서 API 문서 확인

## 4단계 — Next.js 환경변수 설정
`D:/simulator/.env.local` 파일 생성:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## API 문서
서버 실행 후 → http://localhost:8000/docs
