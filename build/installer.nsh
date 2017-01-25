!macro customInstall
	;better method ? http://stackoverflow.com/a/26884194

	ClearErrors

	ReadRegStr $R0 HKLM "SOFTWARE\Classes\Installer\Dependencies\{e46eca4f-393b-40df-9f49-076faf788d83}" "Version"

	IfErrors 0 +15

	ReadRegStr $R0 HKLM "SOFTWARE\Classes\Installer\Dependencies\{f144e08f-9cbe-4f09-9a8c-f2b858b7ee7f}" "Version"

	IfErrors 0 +13

	!include x64.nsh

	${If} ${RunningX64}
		NSISdl::download "https://download.microsoft.com/download/9/3/F/93FCF1E7-E6A4-478B-96E7-D4B285925B00/vc_redist.x64.exe" "visual_cpp_redistributable.exe"
	${Else}
		NSISdl::download "https://download.microsoft.com/download/9/3/F/93FCF1E7-E6A4-478B-96E7-D4B285925B00/vc_redist.x86.exe" "visual_cpp_redistributable.exe"
	${EndIf}       

	Pop $0

	${If} $0 == "success"
		ExecWait '"visual_cpp_redistributable.exe"  /passive /norestart'	
	${Else}
	    MessageBox mb_iconstop "Error: $0"
	${EndIf}
!macroend
