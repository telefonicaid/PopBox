Summary: Popbox module to manage node + Redis value server
Name: popbox
Version: 0.0.2
Release: 2
License: GNU
BuildRoot: %{_topdir}/BUILDROOT/
BuildArch: x86_64
Requires: nodejs >= 0.8
Requires(post): /sbin/chkconfig /usr/sbin/useradd
Requires(preun): /sbin/chkconfig, /sbin/service
Requires(postun): /sbin/service
Group: Applications/Popbox
Vendor: Telefonica I+D
BuildRequires: npm

%description
Simple High-Performance High-Scalability Inbox Notification Service, 
require Redis 2.6 server, node 0.8 and npm only for installatión
%define _prefix_company pdi-
%define _project_name popbox 
%define _project_user %{_project_name}
%define _company_project_name %{_prefix_company}%{_project_name} 
%define _service_name %{_company_project_name}
%define _install_dir /opt
%define _srcdir %{_sourcedir}/../../
%define _project_install_dir %{_install_dir}/%{_company_project_name}
%define _logrotate_conf_dir %{_srcdir}/conf/log
%define _popbox_log_dir %{_localstatedir}/log/%{_company_project_name}
%define _build_root_project %{buildroot}/%{_project_install_dir}
%define _conf_dir /etc/%{_prefix_company}%{_project_name}
%define _log_dir /var/log/%{_prefix_company}%{_project_name}


# -------------------------------------------------------------------------------------------- #
# prep section, setup macro:
# -------------------------------------------------------------------------------------------- #
%prep
rm -Rf $RPM_BUILD_ROOT && mkdir -p $RPM_BUILD_ROOT
[ -d %{_build_root_project} ] || mkdir -p %{_build_root_project}

cp -R %{_srcdir}/lib  %{_srcdir}/package.json %{_srcdir}/index.js \
      %{_srcdir}/bin %{_srcdir}/License.txt %{_build_root_project}
cp -R %{_sourcedir}/*  %{buildroot}
mkdir -p %{buildroot}/var/run/%{_company_project_name}
mkdir -p %{buildroot}/var/log/%{_company_project_name}

%build
cd %{_build_root_project}
# Only production modules
npm install --production
rm package.json

# -------------------------------------------------------------------------------------------- #
# pre-install section:
# -------------------------------------------------------------------------------------------- #
%pre
echo "[INFO] Creating %{_project_user} user"
grep ^%{_project_user} /etc/passwd 
RET_VAL=$?
if [ "$RET_VAL" != "0" ]; then
      /usr/sbin/useradd -c '%{_project_user}' -u 699 -s /bin/false \
      -r -d %{_project_install_dir} %{_project_user}
      RET_VAL=$?
      if [ "$RET_VAL" != "0" ]; then
         echo "[ERROR] Unable create popbox user" \
         exit $RET_VAL
      fi
fi

# -------------------------------------------------------------------------------------------- #
# post-install section:
# -------------------------------------------------------------------------------------------- #
%post
echo "Configuring application:"
rm -Rf /etc/initi.d/%{_service_name}
cd /etc/init.d

#Service 
echo "Creating %{_service_name} service:"
chkconfig --add %{_service_name}

#Config 
rm -Rf %{_conf_dir} && mkdir -p %{_conf_dir}
cd %{_conf_dir}
ln -s %{_project_install_dir}/lib/baseConfig.js %{_project_name}_conf.js

#Logs
#TODO configuration logs
echo "Done"

%preun
if [ $1 == 0 ]; then
   echo "Removing application config files"
   [ -d /etc/%{_company_project_name} ] && rm -rfv /etc/%{_company_project_name}
   [ -d %{_popbox_log_dir} ] && rm -rfv %{_popbox_log_dir}
   [ -d %{_project_install_dir} ] && rm -rfv %{_project_install_dir}
   echo "Destroying %{_service_name} service:"
   chkconfig --del %{_service_name}
   rm -Rf /etc/init.d/%{_service_name}
   
   echo "Done"
fi

%postun
%clean
rm -rf $RPM_BUILD_ROOT
%files
%defattr(755,%{_project_user},%{_project_user},755)
%config /etc/init.d/%{_service_name}
%config /etc/logrotate.d/%{_company_project_name}
%{_project_install_dir}
/var/