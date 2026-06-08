package com.contractorcontrol.api.repository;

import com.contractorcontrol.api.entity.AdmissionEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdmissionRepository extends JpaRepository<AdmissionEntity, String>, JpaSpecificationExecutor<AdmissionEntity> {

  long countByStatus(String status);

  List<AdmissionEntity> findByVendorId(String vendorId);

  List<AdmissionEntity> findByProjectId(String projectId);
}
