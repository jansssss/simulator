@echo off
echo [Bio-R&D Engine] 백엔드 서버 시작 중...
cd /d %~dp0
pip install -r requirements.txt
python main.py
pause
