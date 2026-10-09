!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Bạn có muốn xóa toàn bộ dữ liệu cấu hình, profiles và các bản tải Minecraft của AcousticForge khỏi máy tính không?" IDNO +3
  RMDir /r "$APPDATA\AcousticForge"
  RMDir /r "$APPDATA\XForge"
!macroend
